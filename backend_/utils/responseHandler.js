// Başarılı yanıt göndermek için
function sendSuccess(res, statusCode, message, data = null) {
  const response = {
    success: true,
    message: message
  };
  
  if (data !== null) {
    response.data = data;
  }
  
  return res.status(statusCode).json(response);
}

// Hata yanıtı göndermek için
function sendError(res, statusCode, message) {
  return res.status(statusCode).json({
    success: false,
    message: message
  });
}

module.exports = { sendSuccess, sendError };