export const isToday = (date: Date) => {
  const today = new Date();
  let startOfDay, endOfDay;

  if (today.getHours() < 4) {
    startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 4, 0, 0, 0);
    endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 3, 59, 59, 999);
  } else {
    startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 4, 0, 0, 0);
    endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 3, 59, 59, 999);
  }

  return date >= startOfDay && date < endOfDay;
};
