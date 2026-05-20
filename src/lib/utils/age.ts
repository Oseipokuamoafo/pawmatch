export function calculateAge(dateOfBirth: Date | string): string {
  const dob = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;
  const now = new Date();

  let years = now.getFullYear() - dob.getFullYear();
  let months = now.getMonth() - dob.getMonth();

  if (now.getDate() < dob.getDate()) months--;
  if (months < 0) {
    years--;
    months += 12;
  }

  if (years === 0) return `${months} mo`;
  if (months === 0) return `${years} yr`;
  return `${years}y ${months}mo`;
}
