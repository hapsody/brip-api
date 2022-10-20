import moment from 'moment';

export const getToday = (): string => {
  return moment().startOf('d').format();
};
export const getTomorrow = (): string => {
  return moment().add(1, 'day').startOf('d').format();
};
export const getNDaysLater = (n: number): string => {
  return moment().add(n, 'day').startOf('d').format();
};
