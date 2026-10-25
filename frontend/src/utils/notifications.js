import { toast } from 'react-toastify'

const notify = (method, message) => {
  if (!message) return
  toast[method](message, {
    toastId: `${method}:${message}`,
    role: method === 'error' || method === 'warning' ? 'alert' : 'status',
  })
}

export const notifySuccess = (message) => notify('success', message)
export const notifyError = (message) => notify('error', message)
export const notifyWarning = (message) => notify('warning', message)
export const notifyInfo = (message) => notify('info', message)
