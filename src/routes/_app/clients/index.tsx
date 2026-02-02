import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ReactNode, useState } from 'react';
import { Archive, Building2, Mail, Pencil, Plus, RotateCcw, Search, Users } from 'lucide-react';
import { CLIENTS_QUERY_KEY, clientsQueryOptions } from '@/data/clients/fetch-clients';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';

import { toast } from 'sonner';
import { archiveClientFn, restoreClientFn } from '@/data/clients/clients';
import { EmptyState } from '@/components/empty-state';
import { Client } from '@/lib/types';
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

  export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
function getAvatarColor(name: string): string {
  const colors = [
    'bg-primary/10 text-primary',
    'bg-accent/10 text-accent',
    'bg-status-settled/10 text-status-settled',
    'bg-status-overdue/10 text-status-overdue',
    'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}



export const Route = createFileRoute('/_app/clients/')({
  component: RouteComponent,
  loader: async ({context}) => {
    await context.queryClient.ensureQueryData(clientsQueryOptions());
  }
})

function RouteComponent() {

  
    const [showArchived, setShowArchived] = useState(false);
      const [searchQuery, setSearchQuery] = useState('');
        const [archiveTarget, setArchiveTarget] = useState<Client | null>(null);
         const queryClient = useQueryClient();

         const { data: clients,isLoading } = useSuspenseQuery(clientsQueryOptions(showArchived));

  // Prefetch on mount and when showArchived changes
  const handleToggle = async () => {
    // Prefetch the opposite data before toggling
    await queryClient.prefetchQuery(clientsQueryOptions(!showArchived));
    setShowArchived(!showArchived);
  };

    const filteredClients = clients?.filter((client) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      client.name?.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      client.company?.toLowerCase().includes(query)
    );
  });
  const archiveMutation = useMutation({
  mutationFn: (id: string) => archiveClientFn({ data: { id } }),
  onSuccess: () => {
    // Invalidate ALL client queries (both archived and active)
    queryClient.invalidateQueries({ queryKey: ['clients'] });
    toast.success('Client archived');
    setArchiveTarget(null);
  },
  onError: (error: any) => {
    toast.error(error.message);
  },
});
  const restoreMutation = useMutation({
    mutationFn: (id: string) => restoreClientFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY.clients(showArchived) });
      toast.success('Client restored');
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
    
  return (
      <div className='bg-background lg:pl-5 min-h-screen'> 
      <PageHeader
        title="Clients"
        description="Manage your client list"
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size={'lg'}
             
              onClick={handleToggle}
              className="hidden sm:flex"
            >
              {showArchived ? 'Show Active' : 'Show Archived'}
            </Button>
            <Link to="/clients/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Client
              </Button>
            </Link>
          </div>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggle}
          className="sm:hidden"
        >
          {showArchived ? 'Show Active' : 'Show Archived'}
        </Button>
      </div>

       {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-xl bg-muted dark:bg-muted" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32 bg-muted dark:bg-muted" />
                    <Skeleton className="h-4 w-40 bg-muted dark:bg-muted" />
                    <Skeleton className="h-4 w-24 bg-muted dark:bg-muted" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredClients?.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Users}
              title={
                searchQuery
                  ? 'No clients found'
                  : showArchived
                    ? 'No archived clients'
                    : 'No clients yet'
              }
              description={
                searchQuery
                  ? 'Try adjusting your search'
                  : showArchived
                    ? 'Archived clients will appear here'
                    : 'Add your first client to start creating invoices'
              }
              action={
                !showArchived &&
                !searchQuery && (
                  <Link to="/clients/new">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Client
                    </Button>
                  </Link>
                )
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients?.map((client) => (
            <Card
              key={client.id}
              className="group hover:shadow-kivo-md transition-all duration-200"
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div
                    className={`h-12 w-12 rounded-xl flex items-center justify-center font-semibold text-sm ${getAvatarColor(client.name)}`}
                  >
                    {getInitials(client.name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{client.name}</h3>
                      {showArchived && (
                        <Badge variant="secondary" className="text-xs">
                          Archived
                        </Badge>
                      )}
                    </div>

                    {client.company && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{client.company}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                  <Link to="/clients/$id" params={{ id: client.id }} className="flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full   transition-colors "
                    >
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </Link>
                  {showArchived ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => restoreMutation.mutate(client.id)}
                      disabled={restoreMutation.isPending}
                    >
                      <RotateCcw className="mr-2 h-3.5 w-3.5" />
                      Restore
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setArchiveTarget({ ...client, createdAt: client.createdAt.toISOString(), updatedAt: client.updatedAt.toISOString() })}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Archive className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

       <AlertDialog open={!!archiveTarget} onOpenChange={() => setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive client?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive {archiveTarget?.name}. You can restore them later from the
              archived clients list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => archiveTarget && archiveMutation.mutate(archiveTarget.id)}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      </div>
  )
}
