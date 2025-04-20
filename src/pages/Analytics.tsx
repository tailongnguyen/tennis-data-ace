
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, LineChart, PieChart, ResponsiveContainer, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line } from "recharts";

// Sample data for demonstration
const sampleData = [
  { name: "Jan", wins: 0, losses: 0 },
  { name: "Feb", wins: 0, losses: 0 },
  { name: "Mar", wins: 0, losses: 0 },
  { name: "Apr", wins: 0, losses: 0 },
  { name: "May", wins: 0, losses: 0 },
  { name: "Jun", wins: 0, losses: 0 },
];

const Analytics = () => {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Performance Analytics</h1>
      
      <div className="flex justify-between items-center mb-4">
        <p className="text-muted-foreground">Analyze player performance and statistics.</p>
        <div className="flex items-center gap-2">
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Player" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Players</SelectItem>
              <SelectItem value="no-data">No players available</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="year">
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="quarter">Last Quarter</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Win/Loss Ratio</CardTitle>
            <CardDescription>Overall performance ratio</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px] flex items-center justify-center">
            <p className="text-muted-foreground">No match data available</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Average Score</CardTitle>
            <CardDescription>Points per match</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px] flex items-center justify-center">
            <p className="text-muted-foreground">No match data available</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Match Duration</CardTitle>
            <CardDescription>Average time per match</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px] flex items-center justify-center">
            <p className="text-muted-foreground">No match data available</p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Performance Trends</TabsTrigger>
          <TabsTrigger value="comparisons">Player Comparisons</TabsTrigger>
          <TabsTrigger value="headtohead">Head-to-Head</TabsTrigger>
        </TabsList>
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Over Time</CardTitle>
              <CardDescription>
                Wins and losses over the selected period.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sampleData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="wins" stroke="#8884d8" name="Wins" />
                  <Line type="monotone" dataKey="losses" stroke="#82ca9d" name="Losses" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="comparisons" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Player Comparison</CardTitle>
              <CardDescription>
                Compare statistics between players.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <p className="text-muted-foreground">No player data available for comparison.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="headtohead" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Head-to-Head Records</CardTitle>
              <CardDescription>
                Direct match-up statistics between players.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <p className="text-muted-foreground">No head-to-head data available.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
