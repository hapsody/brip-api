# 개요

본 boiler plate는 MySQL docker 기반의 prisma restful API 서버입니다. 현재 기준으로 기본적으로 세팅되어 있는 상태는 다음과 같습니다.

- typescript
- ts eslint (TypeScript ESLint recommanded style) + prettier
- MySQL docker-compose
- ts prisma
- ts express restful API Server (pm2)
- husky + lint-stage

# How to run

### 1. MySQL docker setting

```shell
$ docker-compose up -d
$ docker ps // 확인

CONTAINER ID   IMAGE     COMMAND                  CREATED        STATUS       PORTS                               NAMES
ce43b2497247   mysql     "docker-entrypoint.s…"   10 days ago    Up 10 days   33060/tcp, 0.0.0.0:3322->3306/tcp   ts-prisma-boilerplate_mysql_1
```

### 2. 환경 변수 및 config 파일 복사(개발자 문의 필요: hjkang@idealbloom.io)

- .env

.env에는 기본적으로 아래 변수들이 필요합니다.<br> DATABASE_URL <br> SHADOW_DATABASE_URL

> ex) <br>DATABASE_URL="mysql://idealbloom:idealbloom1@localhost:3322/myApi?schema=public" SHADOW_DATABASE_URL="mysql://idealbloom:idealbloom1@localhost:3322/shadowdb"

### 3. 서버실행

```shell
$ yarn # node_module 설치

$ yarn migrate # prisma model -> db migrationg
$ yarn generate # prisma/client 스키마 생성
$ yarn seed # 기본 db data seeding

$ yarn start # default dev 모드 실행(= yarn start:dev)
```

### 4. 서버 재시작 및 중지 명령어

```shell
$ yarn restart
$ yarn stop
```

<br>
<br>

# git 명령어

본 boiler-plate에는 husky 설정이 포함되어 있어서 eslint 에러가 있을 경우 commit 이 되지 않습니다. 강제로 커밋을 원한다면 아래의 명령어를 이용해주세요

```shell
$ git commit --no-verify
```

<br>
<br>

# Semantic Commit Messages Rule

See how a minor change to your commit message style can make you a better programmer.

Format: `<type>(<scope>): <subject>`

`<scope>` is optional

### Example

```
feat: add hat  wobble
^--^  ^------------^
|     |
|     +-> Summary in present tense.
|
+-------> Type: chore, docs, feat, fix, refactor, style, or test.
```

More Examples:

- `feat`: (new feature for the user, not a new feature for build script)
- `fix`: (bug fix for the user, not a fix to a build script)
- `docs`: (changes to the documentation)
- `style`: (formatting, missing semi colons, etc; no production code change)
- `refactor`: (refactoring production code, eg. renaming a variable)
- `test`: (adding missing tests, refactoring tests; no production code change)
- `chore`: (updating grunt tasks etc; no production code change)

References:

- https://www.conventionalcommits.org/
- https://seesparkbox.com/foundry/semantic_commit_messages
- http://karma-runner.github.io/1.0/dev/git-commit-msg.html

<br>
<br>

# Troubleshooting

### prisma shadowdb 생성 오류

현재 구성되어 있는 docker-compose.yml 을 통해 도커 mysql을 구성하였다면 문제가 없을 것입니다.

그러나 서버에 MySQL을 직접 구성하는 경우는 아래와 같은 shadowdb 문제에 직면할수 있습니다.

prisma 에서 migrate 명령 등을 실행하면 shadowdb라는 데이터베이스를 생성하고 <br> 이와 실제 서비스 데이터 베이스간 비교를 통해 draft change 등의 체크를 하는데 사용됩니다. ((참조글)[https://www.prisma.io/docs/concepts/components/prisma-migrate/shadow-database])

최초 `prisma migrate dev` 명령을 실행하여 schema의 내용을 DB에 구성하려고 하면 문제가 발생할 것입니다.

```
(base)  ✘ hjkang  ~/Documents/idealbloom/ts-prisma-boilerplate   main ±✚  yarn migrate
yarn run v1.22.11
$ prisma migrate dev
Environment variables loaded from .env
Prisma schema loaded from src/prisma/schema.prisma
Datasource "db": MySQL database "myApi", schema "public" SHADOW_DATABASE_URL="mysql://idealbloom:idealbloom1@localhost:3322/shadowdb" at "localhost:3322"

Error: P3014

Prisma Migrate could not create the shadow database. Please make sure the database user has permission to create databases. Read more about the shadow database (and workarounds) at https://pris.ly/d/migrate-shadow

Original error: Error code: P1010

User `idealbloom` was denied access on the database `myApi`

error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.
```

이것은 docker-compose에서 기본 생성을 세팅한 계정인 idealbloom 의 db 생성 권한이 없기 때문입니다. 수작업으로 shadowdb를 생성하고 prisma가 접근할 계정에 접근 및 권한을 제공하면 됩니다.

mysql 커맨드 창 또는 Dbeaver와 같은 DB 툴의 커맨드 창에서 아래 SQL 문을 실행해주면 됩니다. 당연히 권한을 주기 위해서는 root계정의 권한이 필요할 것입니다.

```sql
# create databases
CREATE DATABASE IF NOT EXISTS `shadowdb`;

# create root user and grant rights
-- CREATE USER 'root'@'localhost' IDENTIFIED BY 'local';
GRANT ALL PRIVILEGES ON shadowdb.* TO 'idealbloom'@'%';
FLUSH privileges;
```

### ts-prisma-restful-bp MySQL docker 볼륨 re-clean & start up

```shell
$ docker ps -a # running 중이지 않은 container 포함 리스트 출력

base)  ✘ hjkang  ~/Documents/idealbloom/ts-prisma-restful-bp   main  docker ps -a
CONTAINER ID   IMAGE     COMMAND                  CREATED        STATUS        PORTS                               NAMES
267f8650e1b3   mysql     "docker-entrypoint.s…"   2 weeks ago    Up 22 hours   33060/tcp, 0.0.0.0:3322->3306/tcp   ts-prisma-boilerplate_mysql_1
7dddf263c8a8   mysql     "docker-entrypoint.s…"   2 months ago   Up 22 hours   33060/tcp, 0.0.0.0:3312->3306/tcp   locomotionapi_mysql_1
46e103370dd1   mysql     "docker-entrypoint.s…"   5 months ago   Up 22 hours   33060/tcp, 0.0.0.0:3308->3306/tcp   stiapi_mysql_1
240

$ docker-compose down # (= docker stop <CONTAINER ID or CONTAINER NAMES>)

(base)  hjkang  ~/Documents/idealbloom/ts-prisma-restful-bp   main  docker-compose down
Removing network ts-prisma-restful-bp_default
WARNING: Network ts-prisma-restful-bp_default not found.

$ docker rm <CONTAINER ID or CONTAINER NAMES>

(base)  hjkang  ~/Documents/idealbloom/ts-prisma-restful-bp   main  docker rm ts-prisma-boilerplate_mysql_1
ts-prisma-boilerplate_mysql_1


$ docker volume ls

(base)  hjkang  ~/Documents/idealbloom/ts-prisma-restful-bp   main  docker volume ls
DRIVER    VOLUME NAME
local     locomotionapi_db
local     pineappleapi_app_db
local     pineappleapi_db
local     stiapi_db
local     ts-prisma-boilerplate_db

$ docker volume rm ts-prisma-boilerplate_db

(base)  hjkang  ~/Documents/idealbloom/ts-prisma-restful-bp   main  docker volume rm ts-prisma-boilerplate_db
ts-prisma-boilerplate_db

$ docker-compose up -d # 이미지 & 컨테이너 & 볼륨 재생성
```
