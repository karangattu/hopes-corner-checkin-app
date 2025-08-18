export const pacificDateStringFrom = (dateLike = new Date()) => {
  const d = new Date(dateLike);
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(d);
};

export const todayPacificDateString = () => pacificDateStringFrom(new Date());
