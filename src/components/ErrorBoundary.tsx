import React from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children?: React.ReactNode
}

interface State {
  hasError: boolean
  message?: string
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error) {
    console.error('页面出错：', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md w-full card border rounded-xl p-6 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">页面出现错误</h3>
            <p className="text-sm text-muted-foreground mb-4">{this.state.message || '请刷新页面重试'}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded-md text-sm"
            >
              刷新页面
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
