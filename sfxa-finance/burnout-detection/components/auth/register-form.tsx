"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import { register, type AuthActionState } from "@/app/actions/auth";
import type { Department } from "@/lib/auth/roles";
import { useActionToast } from "@/hooks/use-action-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = {};

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function RegisterForm({
  departments,
}: {
  departments: Department[];
}) {
  const [state, formAction, pending] = useActionState(register, initialState);
  useActionToast(state);

  return (
    <Card className="w-full max-w-lg border-border/80 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Student registration</CardTitle>
        <CardDescription>
          Create your student account, then sign in to complete your profile.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="student_number">Student Number</Label>
              <Input
                id="student_number"
                name="student_number"
                placeholder="2026-0001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input id="first_name" name="first_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="middle_name">Middle Name</Label>
              <Input id="middle_name" name="middle_name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input id="last_name" name="last_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="suffix">Suffix</Label>
              <Input id="suffix" name="suffix" placeholder="Jr., Sr., III" />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="department_id">Course</Label>
              <select
                id="department_id"
                name="department_id"
                required
                defaultValue=""
                className={selectClassName}
                disabled={departments.length === 0}
              >
                <option value="" disabled>
                  {departments.length === 0
                    ? "No courses available"
                    : "Select course"}
                </option>
                {departments.map((dept) => (
                  <option key={dept.department_id} value={dept.department_id}>
                    {dept.description || dept.department_name}
                  </option>
                ))}
              </select>
              {departments.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Courses could not be loaded. Ask the Guidance Office to add
                  active departments.
                </p>
              ) : null}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="year_level">Year Level</Label>
              <select
                id="year_level"
                name="year_level"
                required
                defaultValue=""
                className={selectClassName}
              >
                <option value="" disabled>
                  Select year level
                </option>
                {[1, 2, 3, 4,].map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@school.edu"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm Password</Label>
              <Input
                id="confirm_password"
                name="confirm_password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pending} size="lg">
            {pending ? (
              <>
                <Loader2 className="animate-spin" />
                Creating account…
              </>
            ) : (
              "Register"
            )}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
