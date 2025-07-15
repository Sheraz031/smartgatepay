export default function customError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}
