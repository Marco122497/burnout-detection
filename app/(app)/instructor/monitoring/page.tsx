export const metadata = {
  title: "Student Monitoring",
};

export default function InstructorMonitoringPage() {
  return (
    <div className="flex h-full min-h-full flex-col items-center justify-center px-4 text-center">
      <p className="text-base font-medium">Select a student</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Choose a name from the list to open their weekly monitoring assessment
        history on this side.
      </p>
    </div>
  );
}
