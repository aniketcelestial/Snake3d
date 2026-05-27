import { createClient } from '../utils/supabase/server'
import { cookies } from 'next/headers'

type Todo = {
  id: number | string
  name?: string | null
}

export default async function Page() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data: todos } = await supabase.from('todos').select('id, name')

  const typedTodos = (todos ?? []) as Todo[]

  return (
    <main style={{ padding: '48px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: '16px' }}>Snake 3D</h1>
      <p style={{ marginBottom: '24px', maxWidth: 560 }}>
        This project is now a TypeScript-only Next.js app that is ready for Vercel deployment.
      </p>

      <section>
        <h2 style={{ marginBottom: '12px' }}>Todos from Supabase</h2>
        {typedTodos.length === 0 ? (
          <p>No todos found or the table is not available yet.</p>
        ) : (
          <ul>
            {typedTodos.map((todo) => (
              <li key={todo.id}>{todo.name ?? `Todo ${todo.id}`}</li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
