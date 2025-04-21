
import { RecordMatchDialog } from "@/components/dialogs/RecordMatchDialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useMatches } from "@/hooks/useMatches";
import { format } from "date-fns";

const Matches = () => {
  const { matches, isLoading } = useMatches();
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMatches = matches.filter(match => {
    // Filter by match type
    if (filterType !== "all" && match.match_type !== filterType) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const hasPlayer = match.player1?.name?.toLowerCase().includes(searchLower) || 
                        match.player2?.name?.toLowerCase().includes(searchLower);
      const hasLocation = match.location?.toLowerCase().includes(searchLower);
      
      return hasPlayer || hasLocation;
    }
    
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Matches</h1>
        <RecordMatchDialog />
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
                <TableHead>Player(s)</TableHead>
                <TableHead>Opponent(s)</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6">
                    Loading matches...
                  </TableCell>
                </TableRow>
              ) : filteredMatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    {matches.length === 0 
                      ? "No match records yet. Record your first match to see it here."
                      : "No matches found matching your filters."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredMatches.map((match) => (
                  <TableRow key={match.id}>
                    <TableCell>
                      {format(new Date(match.match_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>{match.player1?.name || "Unknown"}</TableCell>
                    <TableCell>{match.player2?.name || "Unknown"}</TableCell>
                    <TableCell>{match.score}</TableCell>
                    <TableCell>{match.location || "-"}</TableCell>
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

export default Matches;
