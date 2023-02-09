# prisma DB 관리하기

참조: https://www.prisma.io/docs/

### Schema 수정을 통한 DB 기본 업데이트

1. schema.prisma 수정

```
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider          = "mysql"
  url               = env("DATABASE_URL")           // .env에 변수 설정해야 합니다.
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")    // .env에 변수 설정해야 합니다.
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  pw        String
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @default(now())
}
```

2. schema 변경사항 DB 마이그레이션(적용하기)

```
$ yarn migrate // (= npx prisma migrate dev)
```

3. Prisma Client에 마이그레이션된 상태의 모델 생성

```
$ yarn generate  // (= npx prisma generate)
```

### DB 마이그레이션 롤백하기

기본적으로 prisma에서는 DB 마이그레이션 rollback(undo) 기능을 지원하지 않는다. ([참조글](https://github.com/prisma/prisma/discussions/4617)) <br>때문에 롤백을 위해서는 /migrations 디렉토리중에서 롤백하고자 하는 마이그레이션을 직접 삭제하고 reset를 해야한다.

```
// /migrations 디렉토리에서 롤백하고자 하는 마이그레이션을 삭제한후 아래 명령어 실행
$ yarn prisma migrate reset
```

reset 기능은 기존에 존재하던 테이블들을 drop 하고 /migrations 디렉토리에 존재하는 히스토리대로 다시 마이그레이션을 수행한다.

이렇게 하면 존재하던 Attribute 들이 사라질수 있기 때문에 가급적 서비스 상태의 DB를 수정하는 일은 없어야 한다.

### 롤백 후 새로운 마이그레이션 추가하기

reset 명령 필요없이 `yarn prisma migrate`를 실행하면 덮어써진다.

### 두 데이터베이스 diff sql 쿼리문 추출하기

boiler-plate 구성하는중에는 리모트 서버를 생성하지 않아 직접 테스트하진 않았다. <br> 추후 업데이트 예정

```
$ yarn prisma migrate \
--preview-feature \
--from-url "mysql://idealbloom:idealbloom1@localhost:3322/myApi \
--to-url "mysql:idealbloom:idealbloom@xxx.xxx.xxx.xxx/myApi \
--script > diff.sql
```

# Prisma TroubleShooting
## 1. Shadowdb 가 삭제됨.

왜인지 알수 없으나 shadowdb가 없어져서 다음과 같이 에러가 발생하는 경우가 있었다.

```bash
$ prisma migrate dev
Environment variables loaded from .env
Prisma schema loaded from src/prisma/schema.prisma
Datasource "db": MySQL database "travelit-api" at "localhost:3323"

Error: P1003

Database `shadowdb` does not exist on the database server at `localhost:3323`.
```

### 1. shadowdb를 수동으로 생성해준다.

먼저 수동으로 dbeaver등의 db manager를 통하거나 mysql 커맨드를 통해 shadowdb database를 생성해주자.

### 2. 현재상태까지의 migration 정보를 업데이트해준다.

```bash
$ npx prisma db push
$ npx prisma migrate dev
```

이랬는데… all data will be lost 가 떠서 전체 데이터를 날려야 마이그레이션이 된다고 한다..

아무리 생각해도 FavoriteTravelType 단순 모델 추가인데 왜 그런가 했는데

User와 릴레이션 때문이었다. 

정상적으로 migrate dev가 진행되었다면 새로 추가되는것이기 때문에 상관없어야 했지만

shadowdb 복구 과정에서  `prisma db push` 했기 때문에 먼저 FavoriteTravelType가 db에 생성되어 있었고 여기에 migrate를 하니 변경이라고 생각해서 차이가 발생한것 같았다.

수동으로 FavoriteTravelType을 날리고 yarn migrate를 진행했더니 정상 진행되었다.

## 2. (중요) 변경된 테이블만 제외하고 나머지 데이터는 유지하면서 schema 수정사항 적용하기

`$ npx prisma db push`를 하면 현재 schema.prisma 파일에 있는 스키마 형태대로 DB 에 덮어쓰기한다고 생각하면 될것같다.

- 정확히는 DB에  **DDL (Data Definition Language, 데이터 정의어)** 명령을 적용하는것 같다. 즉 테이블 생성및 삭제, 필드의 이름이나 타입, constraint, 인덱스 변경, 등등 만 수행한다. 데이터를 직접 건드리는 insert나 update, delete 등은 빼고

이를 이용하면 관련된 테이블만 빼고 나머지 데이터는 보존하는 식으로 할수 있다.

1. 일단 작성한 schema.prisma를 업데이트 하려는 현재 스키마에서  직전의 유효한 스키마 상태로 돌린다.
    
    `$ git stash` 또는 커밋을 했다면 `$ git checkout HEAD^`
    
2. 그다음 `$ npx prisma db push`를 수행하여 그 스키마 상태로 돌린다.
3. `$ yarn migrate`

간혹 이미 마이그레이션을 했는데 스키마에서 필드 이름이나 constraint만 변경하고 다시 `yarn migrate` 하는 경우 이미 마이그레이션 전체 데이터를 reset 하려고 하는 경우가 있다. 이런 경우에는 아래 과정을 좀 더 해줘야한다.

1. _migrations 폴더에서 이미 수행한 마이그레이션 폴더를 찾아 지운다.
2. 수동으로 **_prisma_migrations** 테이블에서 위와 동일한 마이그레이션 이름을 찾아 항목을 삭제한다.
3. 다시 `$ yarn migrate`