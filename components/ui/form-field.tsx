"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface FormFieldProps {
  label?: React.ReactNode
  hint?: React.ReactNode
  error?: string | null
  htmlFor?: string
  className?: string
  children: React.ReactNode
}

export function FormField({
  label,
  hint,
  error,
  htmlFor,
  className,
  children,
}: FormFieldProps) {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined
  const hintId = htmlFor ? `${htmlFor}-hint` : undefined
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
    undefined

  let enhancedChildren: React.ReactNode = children
  if (React.isValidElement(children) && htmlFor) {
    enhancedChildren = React.cloneElement(
      children as React.ReactElement<Record<string, unknown>>,
      {
        id: htmlFor,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      }
    )
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-foreground"
        >
          {label}
        </label>
      )}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {enhancedChildren}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
