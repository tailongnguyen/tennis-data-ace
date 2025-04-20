
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePlayers } from "@/hooks/usePlayers";
import { useAuth } from "@/contexts/AuthContext";

const playerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  age: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Age must be a positive number"),
  playing_style: z.string().min(2, "Playing style must be at least 2 characters"),
});

type PlayerFormValues = z.infer<typeof playerSchema>;

export function AddPlayerDialog() {
  const [open, setOpen] = useState(false);
  const { addPlayer } = usePlayers();
  const { user } = useAuth();

  const form = useForm<PlayerFormValues>({
    resolver: zodResolver(playerSchema),
    defaultValues: {
      name: "",
      age: "",
      playing_style: "",
    },
  });

  async function onSubmit(data: PlayerFormValues) {
    if (!user) return;

    try {
      await addPlayer.mutateAsync({
        name: data.name,
        age: Number(data.age),
        playing_style: data.playing_style,
      });
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error adding player:", error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Player
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Player</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter player name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Enter age" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="playing_style"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Playing Style</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter playing style" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Player</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
