"use client"

import { toast } from "sonner"
import { useState } from "react"
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
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Slider } from "@/components/ui/slider"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, LineChart, Line, Legend } from "@/components/ui/chart"
import { Bell, ChevronDown, Info, Menu, Settings, Trash2, Bold, Italic, Underline, Calendar, Home, DollarSign } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

export default function DashboardPage() {
  const [progress, setProgress] = useState(65)
  const [sliderValue, setSliderValue] = useState([50])
  const [loading, setLoading] = useState(false)

  const chartData = [
    { month: "Jan", income: 2400, expenses: 1398 },
    { month: "Feb", income: 1398, expenses: 2210 },
    { month: "Mar", income: 9800, expenses: 2290 },
    { month: "Apr", income: 3908, expenses: 2000 },
    { month: "May", income: 4800, expenses: 2181 },
    { month: "Jun", income: 3800, expenses: 2500 },
  ]

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">
              <Home className="h-4 w-4" />
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Component Showcase</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">UI Components Showcase</h1>
          <p className="text-muted-foreground">
            Explore all available UI components for the tracker
          </p>
        </div>
        
        {/* Sheet Example */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">
              <Menu className="h-4 w-4 mr-2" />
              Open Menu
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Settings Panel</SheetTitle>
              <SheetDescription>
                Configure your preferences here
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <Label>Notifications</Label>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <Label>Dark Mode</Label>
                <Switch />
              </div>
              <div className="space-y-2">
                <Label>Volume</Label>
                <Slider value={sliderValue} onValueChange={setSliderValue} max={100} step={1} />
                <p className="text-sm text-muted-foreground">{sliderValue}%</p>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Tabs with different component sections */}
      <Tabs defaultValue="interactive" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="interactive">Interactive</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="data">Data & Charts</TabsTrigger>
          <TabsTrigger value="navigation">Navigation</TabsTrigger>
        </TabsList>

        {/* Interactive Components Tab */}
        <TabsContent value="interactive" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Toast & Alert Dialog Card */}
            <Card>
              <CardHeader>
                <CardTitle>Notifications & Alerts</CardTitle>
                <CardDescription>Toast and alert dialog examples</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => toast.success("Transaction added successfully!")}
                  className="w-full"
                  variant="outline"
                >
                  Show Success Toast
                </Button>
                <Button
                  onClick={() => toast.error("Failed to save transaction")}
                  className="w-full"
                  variant="outline"
                >
                  Show Error Toast
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      Delete Transaction
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the transaction.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => toast.success("Transaction deleted")}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            {/* Form Controls Card */}
            <Card>
              <CardHeader>
                <CardTitle>Form Controls</CardTitle>
                <CardDescription>Checkboxes, switches, and radios</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="terms" />
                  <Label htmlFor="terms">Accept terms and conditions</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="marketing" defaultChecked />
                  <Label htmlFor="marketing">Send marketing emails</Label>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Enable notifications</Label>
                  <Switch />
                </div>
                <div className="space-y-2">
                  <Label>Transaction Type</Label>
                  <RadioGroup defaultValue="expense">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="income" id="income" />
                      <Label htmlFor="income">Income</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="expense" id="expense" />
                      <Label htmlFor="expense">Expense</Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            {/* Slider & Progress Card */}
            <Card>
              <CardHeader>
                <CardTitle>Progress & Sliders</CardTitle>
                <CardDescription>Visual progress indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <Label>Monthly Budget</Label>
                    <span className="text-muted-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} />
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setProgress(Math.min(100, progress + 10))}
                  >
                    Add 10%
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Set Budget Limit</Label>
                  <Slider
                    value={[progress]}
                    onValueChange={(value) => setProgress(value[0])}
                    max={100}
                    step={1}
                  />
                  <p className="text-sm text-muted-foreground">
                    Current: ${(progress * 50).toFixed(0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Popover & Tooltip Card */}
            <Card>
              <CardHeader>
                <CardTitle>Popovers & Tooltips</CardTitle>
                <CardDescription>Contextual information displays</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Info className="h-4 w-4 mr-2" />
                        Hover for tooltip
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>This is a helpful tooltip!</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Settings className="h-4 w-4 mr-2" />
                      Open Popover
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <div className="space-y-2">
                      <h4 className="font-semibold">Quick Settings</h4>
                      <p className="text-sm text-muted-foreground">
                        Configure your transaction preferences
                      </p>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="auto-save" />
                        <Label htmlFor="auto-save">Auto-save</Label>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Button variant="link" className="w-full">
                      Hover Card Example
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold">Transaction Details</h4>
                      <p className="text-sm text-muted-foreground">
                        View detailed information about your transactions when hovering over items
                      </p>
                      <div className="flex items-center pt-2">
                        <Badge>Premium Feature</Badge>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </CardContent>
            </Card>

            {/* Toggle & Toggle Group Card */}
            <Card>
              <CardHeader>
                <CardTitle>Toggles</CardTitle>
                <CardDescription>Toggle buttons and groups</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Text Formatting</Label>
                  <ToggleGroup type="multiple">
                    <ToggleGroupItem value="bold" aria-label="Toggle bold">
                      <Bold className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="italic" aria-label="Toggle italic">
                      <Italic className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="underline" aria-label="Toggle underline">
                      <Underline className="h-4 w-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <div className="space-y-2">
                  <Label>View Mode</Label>
                  <ToggleGroup type="single" defaultValue="list">
                    <ToggleGroupItem value="list">List</ToggleGroupItem>
                    <ToggleGroupItem value="grid">Grid</ToggleGroupItem>
                    <ToggleGroupItem value="calendar">Calendar</ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <Toggle aria-label="Toggle notifications">
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </Toggle>
              </CardContent>
            </Card>

            {/* Command Palette Card */}
            <Card>
              <CardHeader>
                <CardTitle>Command Palette</CardTitle>
                <CardDescription>Quick search and actions</CardDescription>
              </CardHeader>
              <CardContent>
                <Command className="rounded-lg border">
                  <CommandInput placeholder="Search transactions..." />
                  <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup heading="Suggestions">
                      <CommandItem>
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>View Calendar</span>
                      </CommandItem>
                      <CommandItem>
                        <DollarSign className="mr-2 h-4 w-4" />
                        <span>Add Transaction</span>
                      </CommandItem>
                      <CommandItem>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Feedback Components Tab */}
        <TabsContent value="feedback" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Skeleton Loading Card */}
            <Card>
              <CardHeader>
                <CardTitle>Skeleton Loaders</CardTitle>
                <CardDescription>Loading state placeholders</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
                <Skeleton className="h-20 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-20" />
                  <Skeleton className="h-10 w-20" />
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setLoading(true)
                    setTimeout(() => setLoading(false), 2000)
                  }}
                >
                  {loading ? "Loading..." : "Trigger Loading"}
                </Button>
              </CardContent>
            </Card>

            {/* Accordion Card */}
            <Card>
              <CardHeader>
                <CardTitle>Accordion</CardTitle>
                <CardDescription>Collapsible content sections</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>How do I add a transaction?</AccordionTrigger>
                    <AccordionContent>
                      Click the &quot;Add Transaction&quot; button and fill in the amount, category, and description.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <AccordionTrigger>Can I export my data?</AccordionTrigger>
                    <AccordionContent>
                      Yes, you can export your data in CSV or JSON format from the settings page.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3">
                    <AccordionTrigger>Is my data secure?</AccordionTrigger>
                    <AccordionContent>
                      All data is encrypted and stored securely in Supabase with row-level security.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            {/* Collapsible Card */}
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle>Collapsible</CardTitle>
                <CardDescription>Expandable content sections</CardDescription>
              </CardHeader>
              <CardContent>
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      View transaction details
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4 space-y-2">
                    <div className="rounded-md border p-4">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Transaction ID:</span>
                        <span className="text-sm text-muted-foreground">#TXN-001</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Date:</span>
                        <span className="text-sm text-muted-foreground">Dec 26, 2025</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Category:</span>
                        <Badge>Food & Dining</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Amount:</span>
                        <span className="text-sm font-semibold text-red-600">-$45.50</span>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Data & Charts Tab */}
        <TabsContent value="data" className="space-y-4">
          {/* Charts Card */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Charts</CardTitle>
              <CardDescription>Income vs Expenses over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip />
                  <Legend />
                  <Bar dataKey="income" fill="#22c55e" />
                  <Bar dataKey="expenses" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trend Analysis</CardTitle>
              <CardDescription>Line chart showing trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} />
                  <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Scroll Area Card */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction List (Scrollable)</CardTitle>
              <CardDescription>Scroll area for long content</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">Transaction #{i + 1}</p>
                      <p className="text-sm text-muted-foreground">Dec {26 - i}, 2025</p>
                    </div>
                    <span className={`font-semibold ${i % 2 === 0 ? "text-green-600" : "text-red-600"}`}>
                      {i % 2 === 0 ? "+" : "-"}${(Math.random() * 200).toFixed(2)}
                    </span>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Context Menu Example */}
          <Card>
            <CardHeader>
              <CardTitle>Context Menu</CardTitle>
              <CardDescription>Right-click the box below</CardDescription>
            </CardHeader>
            <CardContent>
              <ContextMenu>
                <ContextMenuTrigger className="flex h-[200px] w-full items-center justify-center rounded-md border border-dashed">
                  <p className="text-sm text-muted-foreground">Right-click here</p>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-64">
                  <ContextMenuItem>View Details</ContextMenuItem>
                  <ContextMenuItem>Edit Transaction</ContextMenuItem>
                  <ContextMenuItem>Duplicate</ContextMenuItem>
                  <ContextMenuItem className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Navigation Tab */}
        <TabsContent value="navigation" className="space-y-4">
          {/* Pagination Card */}
          <Card>
            <CardHeader>
              <CardTitle>Pagination</CardTitle>
              <CardDescription>Navigate through pages</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious href="#" />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#" isActive>1</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#">2</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#">3</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext href="#" />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
