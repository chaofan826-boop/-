import { post } from './request'

export const uploadAvatar = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return post<{ url: string }>('/upload/avatar', formData)
}

export const uploadProductImage = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return post<{ url: string }>('/upload/product', formData)
}

export const uploadBannerImage = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return post<{ url: string }>('/upload/banner', formData)
}

export const uploadChatImage = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return post<{ url: string }>('/upload/chat', formData)
}
