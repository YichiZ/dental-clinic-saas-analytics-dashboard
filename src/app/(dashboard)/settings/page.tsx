'use client'

import { useState, useEffect } from 'react'
import { Save, UserPlus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface Clinic {
  id: string
  name: string
  address: string
  phone: string
  email: string
}

interface Staff {
  id: string
  name: string
  role: string
  email: string
  phone: string | null
}

interface SettingsData {
  clinic: Clinic | null
  staff: Staff[]
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData>({ clinic: null, staff: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
  })

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d: SettingsData) => {
        setData(d)
        if (d.clinic) {
          setForm({
            name: d.clinic.name,
            address: d.clinic.address,
            phone: d.clinic.phone,
            email: d.clinic.email,
          })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveMessage('')

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setSaveMessage('Saved successfully')
      } else {
        setSaveMessage('Failed to save')
      }
    } catch {
      setSaveMessage('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const ROLE_COLORS: Record<string, string> = {
    dentist: 'bg-blue-100 text-blue-800',
    hygienist: 'bg-green-100 text-green-800',
    admin: 'bg-purple-100 text-purple-800',
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-48 rounded-lg bg-gray-100" />
          <div className="h-64 rounded-lg bg-gray-100" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clinic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Clinic Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              {saveMessage && (
                <span
                  className={`text-sm ${
                    saveMessage.includes('success') ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {saveMessage}
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Staff ({data.staff.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {data.staff.length === 0 ? (
            <p className="text-sm text-gray-500">No staff members found</p>
          ) : (
            <div className="space-y-3">
              {data.staff.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-gray-900">{member.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{member.email}</p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      ROLE_COLORS[member.role] ?? 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
