import { Loader2 } from "lucide-react"

interface LoaderProps {
  size?: number
  className?: string
}

export function Loader({ size = 24, className = "" }: LoaderProps) {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className={`animate-spin text-primary ${className}`} size={size} />
    </div>
  )
}

