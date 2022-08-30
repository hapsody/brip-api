import moment from 'moment';

export const getToday = (): Date => {
  return new Date(moment().startOf('d').format());
};
export const getTomorrow = (): Date => {
  return new Date(moment().add(1, 'day').startOf('d').format());
};
