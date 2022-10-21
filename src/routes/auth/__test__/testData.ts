export const params = {
  signUp: {
    correctParam: {
      id: 'hawaii@gmail.com',
      password: 'qwer1234',
      phone: '+821012345678',
      phoneAuthCode: '123456',
      nickName: '유쾌한인어',
      cc: 'KR',
      // userToken: 'ba879ba79sd798dab798a7db9a54dfs3',
    },
    invalidParam: {
      undefinedBody: undefined,
      partNullOrUndefined: {
        id: '1234',
        nickName: 'nickname',
      },
    },
  },

  signIn: {
    correctParam: {
      id: 'hawaii@gmail.com',
      password: 'qwer1234',
    },
    invalidParam: {
      undefinedBody: undefined,
      incorrectEmail: {
        id: 'testx@gmail.com',
        password: 'qqqq',
      },
      incorrectPassword: {
        id: 'hawaii@gmail.com',
        password: 'qqqq',
      },
    },
  },
};
export const temp = {};
