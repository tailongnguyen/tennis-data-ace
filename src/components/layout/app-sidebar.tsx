
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  Users, 
  Trophy as TrophyIcon, 
  BarChart3, 
  Swords, 
  FileDown, 
  LogIn,
  LogOut
} from "lucide-react";

const AppSidebar = () => {
  const navigate = useNavigate();
  const { state } = useSidebar();
  const { user, signOut } = useAuth();
  const collapsed = state === "collapsed";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };
  
  const navItems = [
    {
      title: "Dashboard",
      icon: Home,
      path: "/",
    },
    {
      title: "Players",
      icon: Users,
      path: "/players",
    },
    {
      title: "Matches",
      icon: Swords,
      path: "/matches",
    },
    {
      title: "Rankings",
      icon: TrophyIcon,
      path: "/rankings",
    },
    {
      title: "Analytics",
      icon: BarChart3,
      path: "/analytics",
    },
    {
      title: "Export",
      icon: FileDown,
      path: "/export",
    },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center space-x-2">
          <TrophyIcon className="h-6 w-6 text-primary" />
          <h1 className={`text-xl font-bold ${collapsed ? "hidden" : ""}`}>Tennis Tracker</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => navigate(item.path)}
                    >
                      <item.icon className="mr-2 h-5 w-5" />
                      <span>{item.title}</span>
                    </Button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="text-sm text-muted-foreground">
          {user ? (
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-5 w-5" />
              <span>Sign Out</span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => navigate("/login")}
            >
              <LogIn className="mr-2 h-5 w-5" />
              <span>Sign In</span>
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
