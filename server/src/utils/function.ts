export const clearResponse = (response: string) => {
  return response
    .replace(/```json\n/g, '')
    .replace(/```/g, '')
    .trim();
};

// Helper to extract the last part after the last colon
export function getLastErrorMessage(message: string): string {
  const parts = message.split(':');
  return parts.length > 1 ? parts[parts.length - 1].trim() : message;
}
