import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface UserProfileContextType {
  name: string
  profileImage: string | null
  updateName: (name: string) => void
  updateProfileImage: (image: string | null) => void
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined)

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState<string>(() => {
    return localStorage.getItem('userName') || 'Valeria'
  })
  const [profileImage, setProfileImage] = useState<string | null>(() => {
    return localStorage.getItem('profileImage')
  })

  useEffect(() => {
    localStorage.setItem('userName', name)
  }, [name])

  useEffect(() => {
    if (profileImage) {
      localStorage.setItem('profileImage', profileImage)
    } else {
      localStorage.removeItem('profileImage')
    }
  }, [profileImage])

  const updateName = (newName: string) => {
    setName(newName)
  }

  const updateProfileImage = (image: string | null) => {
    setProfileImage(image)
  }

  return (
    <UserProfileContext.Provider
      value={{
        name,
        profileImage,
        updateName,
        updateProfileImage,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  )
}

export function useUserProfile() {
  const context = useContext(UserProfileContext)
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider')
  }
  return context
}
