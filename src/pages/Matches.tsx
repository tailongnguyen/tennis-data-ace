import { RecordMatchDialog } from "@/components/dialogs/RecordMatchDialog";
import { RecordMatchWithAIDialog } from "@/components/dialogs/RecordMatchWithAIDialog";
import { EditMatchDialog } from "@/components/dialogs/EditMatchDialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Pencil, Trash2, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useMatches } from "@/hooks/useMatches";
import { format } from "date-fns";
import { Match } from "@/types/player";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";

const Matches = () => {
  const { matches, isLoading, deleteMatch } = useMatches();
  const [matchToDelete, setMatchToDelete] = useState<string | null>(null);
  const [matchToEdit, setMatchToEdit] = useState<Match | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  const filteredMatches = matches.filter(match => {
    if (filterType !== "all" && match.match_type !== filterType) {
      return false;
    }
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return [
        match.winner1?.name,
        match.winner2?.name,
        match.loser1?.name,
        match.loser2?.name
      ].some(name => name?.toLowerCase().includes(searchLower));
    }
    
    return true;
  });

  const formatPlayers = (match: Match) => {
    if (match.match_type === 'singles') {
      return {
        winners: match.winner1?.name || 'Unknown',
        losers: match.loser1?.name || 'Unknown'
      };
    }
    
    return {
      winners: `${match.winner1?.name || 'Unknown'} / ${match.winner2?.name || 'Unknown'}`,
      losers: `${match.loser1?.name || 'Unknown'} / ${match.loser2?.name || 'Unknown'}`
    };
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Matches</h1>
        <div className="flex space-x-2">
          <RecordMatchWithAIDialog />
          <RecordMatchDialog />
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Match Records</CardTitle>
          <CardDescription>Record and manage tennis match results.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search matches..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select 
              defaultValue="all"
              value={filterType}
              onValueChange={setFilterType}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Match Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Matches</SelectItem>
                <SelectItem value="singles">Singles</SelectItem>
                <SelectItem value="doubles">Doubles</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Team 1</TableHead>
                <TableHead>Team 2</TableHead>
                <TableHead>Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6">
                    Loading matches...
                  </TableCell>
                </TableRow>
              ) : filteredMatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                    {matches.length === 0 
                      ? "No match records yet. Record your first match to see it here."
                      : "No matches found matching your filters."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredMatches.map((match) => {
                  const { winners, losers } = formatPlayers(match);
                  return (
                    <TableRow key={match.id}>
                      <TableCell>
                        {format(new Date(match.match_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>{winners}</TableCell>
                      <TableCell>{losers}</TableCell>
                      <TableCell>{match.score}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setMatchToEdit(match);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog open={matchToDelete === match.id} onOpenChange={(open) => {
                            if (!open) setMatchToDelete(null);
                          }}>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setMatchToDelete(match.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Match Record</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this match record? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    if (matchToDelete) {
                                      deleteMatch.mutate(matchToDelete, {
                                        onSuccess: () => {
                                          toast.success("Match deleted successfully");
                                          setMatchToDelete(null);
                                        },
                                        onError: (error) => {
                                          toast.error("Failed to delete match");
                                          console.error("Error deleting match:", error);
                                        }
                                      });
                                    }
                                  }}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Edit Match Dialog */}
      <EditMatchDialog 
        match={matchToEdit}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </div>
  );
};

export default Matches;
