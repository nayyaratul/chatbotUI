import { createContext, useContext, useState } from 'react'

const ViewportContext = createContext({
  viewport: 'mobile',
  setViewport: () => {},
})

export function ViewportProvider({ children }) {
  const [viewport, setViewport] = useState('mobile')
  return (
    <ViewportContext.Provider value={{ viewport, setViewport }}>
      {children}
    </ViewportContext.Provider>
  )
}

export function useViewport() {
  return useContext(ViewportContext)
}
