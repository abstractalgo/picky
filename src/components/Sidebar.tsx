import { useState } from "react";
import { useProject } from "@/store/ProjectContext";
import type { Person, Milestone, Tag } from "@/types";
import { HoverTarget } from "@/components/HoverStore";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PersonDialog } from "./dialogs/PersonDialog";
import { MilestoneDialog } from "./dialogs/MilestoneDialog";
import { TagDialog } from "./dialogs/TagDialog";
import {
  Settings,
  Users,
  Flag,
  Tags,
  Plus,
  Calendar,
  Pencil,
} from "lucide-react";
import { format } from "date-fns";

export function Sidebar() {
  const { state } = useProject();

  const [personDialogOpen, setPersonDialogOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | undefined>();

  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | undefined>();

  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | undefined>();

  const handleEditPerson = (person: Person) => {
    setSelectedPerson(person);
    setPersonDialogOpen(true);
  };

  const handleNewPerson = () => {
    setSelectedPerson(undefined);
    setPersonDialogOpen(true);
  };

  const handleEditMilestone = (milestone: Milestone) => {
    setSelectedMilestone(milestone);
    setMilestoneDialogOpen(true);
  };

  const handleNewMilestone = () => {
    setSelectedMilestone(undefined);
    setMilestoneDialogOpen(true);
  };

  const handleEditTag = (tag: Tag) => {
    setSelectedTag(tag);
    setTagDialogOpen(true);
  };

  const handleNewTag = () => {
    setSelectedTag(undefined);
    setTagDialogOpen(true);
  };

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent className="w-80 px-2 sm:w-96">
          <SheetHeader>
            <SheetTitle>Project Settings</SheetTitle>
          </SheetHeader>

          <ScrollArea className="mt-6 h-[calc(100vh-8rem)]">
            <div className="space-y-6">
              {/* People Section */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Users className="h-4 w-4" />
                    People
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleNewPerson}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {state.people.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No people added yet
                    </p>
                  ) : (
                    state.people.map((person) => (
                      <HoverTarget
                        key={person.id}
                        payload={{ type: "person", data: person }}
                      >
                        <div className="group flex items-center justify-between rounded border border-border p-2">
                          <p className="min-w-0 truncate text-sm font-medium">
                            {person.name}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100"
                            onClick={() => handleEditPerson(person)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      </HoverTarget>
                    ))
                  )}
                </div>
              </div>

              <Separator />

              {/* Milestones Section */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Flag className="h-4 w-4" />
                    Milestones
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleNewMilestone}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {state.milestones.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No milestones added yet
                    </p>
                  ) : (
                    state.milestones.map((milestone) => (
                      <HoverTarget
                        key={milestone.id}
                        payload={{ type: "milestone", data: milestone }}
                      >
                        <div className="group flex items-center justify-between rounded border border-border p-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {milestone.name}
                            </p>
                            {(milestone.startDate || milestone.endDate) && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {milestone.startDate &&
                                  format(new Date(milestone.startDate), "MMM d")}
                                {milestone.startDate && milestone.endDate && " - "}
                                {milestone.endDate &&
                                  format(new Date(milestone.endDate), "MMM d")}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100"
                            onClick={() => handleEditMilestone(milestone)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      </HoverTarget>
                    ))
                  )}
                </div>
              </div>

              <Separator />

              {/* Tags Section */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Tags className="h-4 w-4" />
                    Tags
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleNewTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {state.tags.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No tags created yet
                    </p>
                  ) : (
                    state.tags.map((tag) => (
                      <HoverTarget
                        key={tag.id}
                        payload={{ type: "tag", data: tag }}
                      >
                        <Badge
                          variant="secondary"
                          className="cursor-pointer"
                          style={{
                            backgroundColor: tag.color + "20",
                            color: tag.color,
                          }}
                          onClick={() => handleEditTag(tag)}
                        >
                          {tag.name}
                        </Badge>
                      </HoverTarget>
                    ))
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <PersonDialog
        open={personDialogOpen}
        onOpenChange={setPersonDialogOpen}
        person={selectedPerson}
      />

      <MilestoneDialog
        open={milestoneDialogOpen}
        onOpenChange={setMilestoneDialogOpen}
        milestone={selectedMilestone}
      />

      <TagDialog
        open={tagDialogOpen}
        onOpenChange={setTagDialogOpen}
        tag={selectedTag}
      />
    </>
  );
}
