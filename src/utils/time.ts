import moment from 'moment';

export const getToday = (): string => {
  return moment(moment().startOf('d')).toISOString();
};
export const getTomorrow = (): string => {
  return moment(moment().add(1, 'day').startOf('d')).toISOString();
};
export const getNDaysLater = (n: number): string => {
  return moment(moment().add(n, 'day').startOf('d')).toISOString();
};
