export function formatEventDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatRegistrationCountdown(value: string | null) {
  if (!value) {
    return null;
  }

  const target = new Date(value).getTime();
  const remaining = target - Date.now();

  if (Number.isNaN(target) || remaining <= 0) {
    return 'Registration closed';
  }

  const targetDate = new Date(target);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

  // If deadline is on a different day, show full date and time
  if (deadlineDay.getTime() !== today.getTime()) {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      month: 'short',
    }).format(targetDate);
  }

  // Same day: show short countdown
  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}hr ${String(minutes).padStart(2, '0')}m left`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}m left`;
}
