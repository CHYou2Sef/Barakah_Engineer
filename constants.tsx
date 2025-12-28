
import React from 'react';
import { AppMode, TaskCategory, ScheduleTask, WorkoutSplit, Priority } from './types';

export const PRO_SCHEDULE: ScheduleTask[] = [
  {
    id: '1',
    time: '05:00',
    title: 'Fajr & Morning Barakah',
    description: 'Prayer and light stretching.',
    category: TaskCategory.PRAYER,
    priority: Priority.HIGH,
    details: ['Light stretching (5 min)', 'Drink 500ml water']
  },
  {
    id: '2',
    time: '06:30',
    title: 'Anabolic Fuel',
    description: '3 eggs, oats, and dates.',
    category: TaskCategory.MEAL,
    priority: Priority.HIGH
  },
  {
    id: '3',
    time: '08:00',
    title: 'Deep Engineering Work',
    description: '90-min coding sprint.',
    category: TaskCategory.WORK,
    priority: Priority.HIGH
  },
  {
    id: '4',
    time: '16:00',
    title: 'Training Protocol',
    description: 'Hypertrophy bodyweight split.',
    category: TaskCategory.TRAINING,
    priority: Priority.MEDIUM
  },
  {
    id: '5',
    time: '22:00',
    title: 'System Shutdown',
    description: 'Reading and zero blue light.',
    category: TaskCategory.REST,
    priority: Priority.LOW
  }
];

export const SIMPLE_SCHEDULE: ScheduleTask[] = [
  {
    id: 's1',
    time: '07:00',
    title: 'Morning Flow',
    description: 'Pray, Eat, Code.',
    category: TaskCategory.WORK,
    priority: Priority.MEDIUM
  },
  {
    id: 's2',
    time: '12:00',
    title: 'Midday Reset',
    description: 'Lunch and Rest.',
    category: TaskCategory.MEAL,
    priority: Priority.MEDIUM
  },
  {
    id: 's3',
    time: '18:00',
    title: 'Evening Grind',
    description: 'Workout and Dinner.',
    category: TaskCategory.TRAINING,
    priority: Priority.MEDIUM
  }
];

export const WORKOUT_SPLITS: Record<string, WorkoutSplit> = {
  'Upper Body': {
    name: 'Upper Body Focus',
    exercises: [
      { name: 'Push-ups', reps: '12-15', sets: '4' },
      { name: 'Incline Push-ups', reps: '8-12', sets: '3' },
      { name: 'Chair Dips', reps: '6-10', sets: '3' },
      { name: 'Pike Push-ups', reps: '6-10', sets: '3' },
      { name: 'Plank', reps: '40-60s', sets: '3' },
    ]
  },
  'Lower + Back': {
    name: 'Lower & Posterior',
    exercises: [
      { name: 'Squats', reps: '15', sets: '4' },
      { name: 'Lunges', reps: '10 ea', sets: '3' },
      { name: 'Inverted Rows', reps: '8-12', sets: '3' },
      { name: 'Carry Weight Walk', reps: '1 min', sets: '3' },
    ]
  }
};
