
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileDown, FileSpreadsheet, FileText, Calendar } from "lucide-react";
import { useExport } from "@/hooks/useExport";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const Export = () => {
  const { 
    range, 
    setRange, 
    matchType, 
    setMatchType, 
    matchExportData, 
    feeExportData, 
    handleExport, 
    isLoading 
  } = useExport();
  
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  const [activeTab, setActiveTab] = useState<'matches' | 'fees'>('matches');
  
  const handleExportClick = () => {
    handleExport(activeTab, exportFormat);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Export Data</h1>
      <p className="text-muted-foreground">Export your data in different formats.</p>
      
      <Tabs 
        defaultValue="matches" 
        className="space-y-4" 
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'matches' | 'fees')}
      >
        <TabsList>
          <TabsTrigger value="matches">Matches</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
        </TabsList>
        
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === 'matches' ? 'Export Match Data' : 'Export Fee Data'}
              </CardTitle>
              <CardDescription>
                {activeTab === 'matches' 
                  ? 'Export your match records to CSV format.' 
                  : 'Export player fee calculations to CSV format.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="export-format">Export Format</Label>
                  <Select 
                    value={exportFormat} 
                    onValueChange={(val) => setExportFormat(val as 'csv' | 'pdf')}
                  >
                    <SelectTrigger id="export-format">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                    {/* Start Date Picker */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full sm:w-[180px] justify-start text-left font-normal",
                            !range.startDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {range.startDate ? format(range.startDate, "yyyy-MM-dd") : <span>Start date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={range.startDate}
                          onSelect={(date) => date && setRange({ ...range, startDate: date })}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    
                    <span className="hidden sm:block">to</span>
                    
                    {/* End Date Picker */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full sm:w-[180px] justify-start text-left font-normal",
                            !range.endDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {range.endDate ? format(range.endDate, "yyyy-MM-dd") : <span>End date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={range.endDate}
                          onSelect={(date) => date && setRange({ ...range, endDate: date })}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {activeTab === 'matches' && (
                  <div className="space-y-2">
                    <Label htmlFor="match-type">Match Type</Label>
                    <Select 
                      value={matchType} 
                      onValueChange={(val) => setMatchType(val as 'all' | 'singles' | 'doubles')}
                    >
                      <SelectTrigger id="match-type">
                        <SelectValue placeholder="Select match type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="singles">Singles</SelectItem>
                        <SelectItem value="doubles">Doubles</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    {activeTab === 'matches' ? (
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Team 1</TableHead>
                        <TableHead>Team 2</TableHead>
                        <TableHead>Score</TableHead>
                      </TableRow>
                    ) : (
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Matches</TableHead>
                        <TableHead>Wins</TableHead>
                        <TableHead>Draws</TableHead>
                        <TableHead>Losses</TableHead>
                        <TableHead>Base Fee</TableHead>
                        <TableHead>Bet Fee</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    )}
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={activeTab === 'matches' ? 5 : 8} className="text-center py-10">
                          Loading data...
                        </TableCell>
                      </TableRow>
                    ) : activeTab === 'matches' ? (
                      matchExportData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                            No match data found for the selected filters.
                          </TableCell>
                        </TableRow>
                      ) : (
                        matchExportData.slice(0, 5).map((match, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{match['Time']}</TableCell>
                            <TableCell>{match['Type']}</TableCell>
                            <TableCell>{match['Team 1']}</TableCell>
                            <TableCell>{match['Team 2']}</TableCell>
                            <TableCell>{match['Score']}</TableCell>
                          </TableRow>
                        ))
                      )
                    ) : feeExportData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                          No fee data found for the selected time range.
                        </TableCell>
                      </TableRow>
                    ) : (
                      feeExportData.slice(0, 5).map((fee, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{fee['Player Name']}</TableCell>
                          <TableCell>{fee['Total Matches']}</TableCell>
                          <TableCell>{fee['Total Wins']}</TableCell>
                          <TableCell>{fee['Total Draws']}</TableCell>
                          <TableCell>{fee['Total Losses']}</TableCell>
                          <TableCell>{fee['Base Fee']}</TableCell>
                          <TableCell>{fee['Bet Fee']}</TableCell>
                          <TableCell>{fee['Total Fee']}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {(activeTab === 'matches' && matchExportData.length > 5) || 
                 (activeTab === 'fees' && feeExportData.length > 5) ? (
                  <div className="text-center py-2 text-sm text-muted-foreground border-t">
                    Only showing 5 rows. Export to see all {activeTab === 'matches' ? matchExportData.length : feeExportData.length} rows.
                  </div>
                ) : null}
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline">Cancel</Button>
                <Button onClick={handleExportClick}>
                  {exportFormat === 'csv' ? (
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  Export {activeTab === 'matches' ? 'Matches' : 'Fees'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Tabs>
    </div>
  );
};

export default Export;
