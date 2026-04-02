function ok(res, data = null, message = "OK") {
  return res.status(200).json({ success: true, message, data });
}

function created(res, data = null, message = "Created") {
  return res.status(201).json({ success: true, message, data });
}

function bad(res, message = "Bad Request", code = 400) {
  return res.status(code).json({ success: false, message });
}

module.exports = { ok, created, bad };