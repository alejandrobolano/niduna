export function createBabyPhotoPath(
  familyId: string,
  babyId: string,
  uniquePart: string,
): string {
  return `${familyId}/${babyId}/${uniquePart}.jpg`;
}
