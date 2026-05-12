import { useAuth } from '@/context/AuthContext'

export default function Profile() {
  const { user } = useAuth()

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-8">
        Mein Profil
      </h1>

      <div className="rounded-2xl border border-border p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">
          Benutzerinformationen
        </h2>

        <div className="space-y-2 text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Name:</span>{' '}
            {user?.name}
          </p>

          <p>
            <span className="font-medium text-foreground">E-Mail:</span>{' '}
            {user?.email}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border p-6">
        <h2 className="text-xl font-semibold mb-4">
          Meine Bestellungen
        </h2>

        <p className="text-muted-foreground">
          Noch keine Bestellungen vorhanden.
        </p>
      </div>
    </div>
  )
}