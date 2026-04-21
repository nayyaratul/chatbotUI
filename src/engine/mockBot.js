export function respond(userMessage) {
  const payload = userMessage?.widget?.payload ?? {}
  let incoming = ''

  if (userMessage?.widget?.type === 'text') {
    incoming = payload.text ?? ''
  } else if (userMessage?.widget?.type === 'widget_response') {
    incoming = payload?.data?.label ?? JSON.stringify(payload?.data ?? {})
  } else {
    incoming = `(${userMessage?.widget?.type ?? 'unknown'})`
  }

  return {
    type: 'text',
    payload: { text: `You said: ${incoming}` },
  }
}
