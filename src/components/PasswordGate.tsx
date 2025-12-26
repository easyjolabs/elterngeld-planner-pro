import { useState, FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, Loader2 } from 'lucide-react';

interface PasswordGateProps {
  onLogin: (password: string) => Promise<boolean>;
  error: string | null;
  isLoading: boolean;
}

export function PasswordGate({ onLogin, error, isLoading }: PasswordGateProps) {
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isSubmitting) return;

    setIsSubmitting(true);
    await onLogin(password);
    setIsSubmitting(false);
  };

  const showLoading = isLoading || isSubmitting;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="bg-card rounded-2xl shadow-lg border border-border p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">Geschützter Bereich</h1>
            <p className="text-sm text-muted-foreground mt-1 text-center">
              Bitte geben Sie das Passwort ein, um fortzufahren.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={showLoading}
                className="w-full"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={showLoading || !password.trim()}
            >
              {showLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Überprüfe...
                </>
              ) : (
                'Zugang erhalten'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
