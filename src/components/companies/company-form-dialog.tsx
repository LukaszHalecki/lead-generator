'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input, Label, Textarea } from '@/components/ui/input'
import {
  companyFormSchema,
  emptyCompanyForm,
  toCompanyFormValues,
  type CompanyFormValues,
} from '@/lib/validators/company.schema'

interface CompanyFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  initialValues?: CompanyFormValues
  submitLabel?: string
  onSubmit: (values: CompanyFormValues) => Promise<void>
}

export function CompanyFormDialog({
  open,
  onOpenChange,
  title,
  description,
  initialValues,
  submitLabel = 'Zapisz',
  onSubmit,
}: CompanyFormDialogProps) {
  const [form, setForm] = useState<CompanyFormValues>(emptyCompanyForm())
  const [errors, setErrors] = useState<Partial<Record<keyof CompanyFormValues, string>>>({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(initialValues ?? emptyCompanyForm())
      setErrors({})
      setServerError(null)
    }
  }, [open, initialValues])

  function updateField<K extends keyof CompanyFormValues>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)

    const parsed = companyFormSchema.safeParse(form)
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof CompanyFormValues, string>> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof CompanyFormValues
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setLoading(true)
    try {
      await onSubmit(parsed.data)
      onOpenChange(false)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Wystąpił błąd')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            label="Nazwa firmy *"
            value={form.name}
            onChange={(v) => updateField('name', v)}
            error={errors.name}
          />
          <Field
            label="Strona WWW"
            value={form.website ?? ''}
            onChange={(v) => updateField('website', v)}
            error={errors.website}
            placeholder="https://example.com"
          />
          <Field
            label="Email"
            type="email"
            value={form.email ?? ''}
            onChange={(v) => updateField('email', v)}
            error={errors.email}
          />
          <Field
            label="Telefon"
            value={form.phone ?? ''}
            onChange={(v) => updateField('phone', v)}
          />
          <Field
            label="Branża"
            value={form.industry ?? ''}
            onChange={(v) => updateField('industry', v)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Miasto"
              value={form.city ?? ''}
              onChange={(v) => updateField('city', v)}
            />
            <Field
              label="Kraj"
              value={form.country ?? ''}
              onChange={(v) => updateField('country', v)}
            />
          </div>
          <div>
            <Label>Notatki</Label>
            <Textarea
              className="mt-1"
              value={form.notes ?? ''}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Opcjonalne notatki CRM..."
            />
          </div>

          {serverError && <p className="text-sm text-red-600">{serverError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Zapisywanie...' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function companyToFormValues(company: {
  name: string
  website: string | null
  email: string | null
  phone: string | null
  industry: string | null
  city: string | null
  country?: string | null
}) {
  return toCompanyFormValues(company)
}

function Field({
  label,
  value,
  onChange,
  error,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  type?: string
  placeholder?: string
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        className="mt-1"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
