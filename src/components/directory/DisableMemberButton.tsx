'use client'

import { UserX } from 'lucide-react'
import { disableMember } from '@/app/(app)/directory/actions'

interface Props {
  memberId: string
  memberName: string
}

export default function DisableMemberButton({ memberId, memberName }: Props) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!confirm(`Disable ${memberName}? They will lose app access. You can re-activate them any time.`)) {
      e.preventDefault()
    }
  }

  return (
    <form action={disableMember.bind(null, memberId)} onSubmit={handleSubmit}>
      <button type="submit" className="text-red-400 hover:text-red-600 transition-colors" title="Disable member">
        <UserX size={16} />
      </button>
    </form>
  )
}
