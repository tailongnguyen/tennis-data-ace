import { AddPlayerDialog } from "@/components/dialogs/AddPlayerDialog";
import { EditPlayerDialog } from "@/components/dialogs/EditPlayerDialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Trash } from "lucide-react";
import { usePlayers } from "@/hooks/usePlayers";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Players = () => {
  const { players, isLoading, deletePlayer } = usePlayers();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Players</h1>
        <AddPlayerDialog />
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Player Management</CardTitle>
          <CardDescription>Add, edit, and manage your tennis players.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search players..."
                className="pl-8"
              />
            </div>
            <Button variant="outline">Filter</Button>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Playing Style</TableHead>
                <TableHead>Ranking Points</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6">
                    Loading players...
                  </TableCell>
                </TableRow>
              ) : players.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    No players added yet. Add your first player to get started.
                  </TableCell>
                </TableRow>
              ) : (
                players.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell>{player.name}</TableCell>
                    <TableCell>{player.age}</TableCell>
                    <TableCell>{player.playing_style}</TableCell>
                    <TableCell>{player.ranking_points}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <EditPlayerDialog player={player} />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="icon">
                              <Trash className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Player</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {player.name}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deletePlayer.mutate(player.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Players;
