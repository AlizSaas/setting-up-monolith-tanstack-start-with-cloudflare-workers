'use client'
import { useEffect } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

import { CreateClient } from '@/lib/types';
import { toast } from 'sonner';
import { createClientSchema } from '@/lib/schema.type';
import { PageHeader } from '@/routes/_app/clients';
import { createClientFn, getClientByIdFn, updateClientFn } from '@/data/clients/clients';
import { clientQueryOptions, CLIENTS_QUERY_KEY } from '@/data/clients/fetch-clients';

export function ClientFormPage({clientId}: {clientId?: string}) {

  
 
  const isEditing = !!clientId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: client, isLoading: isLoadingClient } = useQuery({
    queryKey: ['clients', clientId],
    queryFn: () => getClientByIdFn({data:{id: clientId!}}),
    enabled: isEditing,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateClient>({
    resolver: zodResolver(createClientSchema),
  });

  useEffect(() => {
    if (client) {
      reset({
        name: client.name,
        email: client.email,
        company: client.company || '',
        address: client.address || '',
        notes: client.notes || '',
      });
    }
  }, [client, reset]);

  const createMutation = useMutation({
    mutationFn: createClientFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY.clientsInvalidation });
      toast.success('Client created successfully');
      navigate({ to: '/clients' });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

const updateMutation = useMutation({
  mutationFn: updateClientFn,
  onSuccess: () => {
    // Invalidate all client lists
    queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY.clientsInvalidation });
    
    // Invalidate the specific client
    queryClient.invalidateQueries(clientQueryOptions(clientId!));
    
    toast.success('Client updated successfully');
    navigate({ to: '/clients' });
  },
});
  const onSubmit = (data: CreateClient) => {
    if (isEditing) {
      updateMutation.mutate({  data:{data: data,id: clientId!} });
    } else {
      createMutation.mutate({data: data});
    }
  };

  if (isEditing && isLoadingClient) {
    return (
      <div className='min-h-screen lg:p-6'>
        <PageHeader title="Edit Client" />
        <Card>
          <CardContent className="p-6 space-y-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='min-h-screen lg:p-6 scroll-auto'>
      <PageHeader
        title={isEditing ? 'Edit Client' : 'New Client'}
        description={isEditing ? 'Update client information' : 'Add a new client to your list'}
      />

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">Name *</Label>
                <Input
                  id="name"
                  placeholder="Client name"
                  className="bg-background text-foreground"
                  {...register('name')}
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="client@example.com"
                  className="bg-background text-foreground"
                  {...register('email')}
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company" className="text-foreground">Company</Label>
              <Input
                id="company"
                placeholder="Company name (optional)"
                className="bg-background text-foreground"
                {...register('company')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-foreground">Address</Label>
              <Textarea
                id="address"
                placeholder="Street address, city, country..."
                rows={3}
                className="bg-background text-foreground"
                {...register('address')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-foreground">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Internal notes about this client..."
                rows={3}
                className="bg-background text-foreground"
                {...register('notes')}
              />
            </div>

            <div className="flex items-center gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: '/clients' })}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? 'Saving...' : 'Creating...'}
                  </>
                ) : isEditing ? (
                  'Save Changes'
                ) : (
                  'Create Client'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
