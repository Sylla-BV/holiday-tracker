export type Absence = {
  id: number;
  startDate: Date;
  endDate: Date;
  type: 'Vacation' | 'Sick Leave' | 'Personal';
  status: 'Approved' | 'Pending' | 'Rejected';
};

export type TeamMember = {
  id: number;
  name: string;
  avatar: string;
  absences: Absence[];
};

export const teamMembers: TeamMember[] = [
  {
    id: 1,
    name: 'Alex Johnson',
    avatar: 'https://placehold.co/100x100.png',
    absences: [
      { id: 101, startDate: new Date('2024-08-05'), endDate: new Date('2024-08-09'), type: 'Vacation', status: 'Approved' },
      { id: 102, startDate: new Date('2024-09-02'), endDate: new Date('2024-09-02'), type: 'Sick Leave', status: 'Approved' },
    ],
  },
  {
    id: 2,
    name: 'Maria Garcia',
    avatar: 'https://placehold.co/100x100.png',
    absences: [
      { id: 201, startDate: new Date('2024-08-19'), endDate: new Date('2024-08-23'), type: 'Vacation', status: 'Approved' },
    ],
  },
  {
    id: 3,
    name: 'James Smith',
    avatar: 'https://placehold.co/100x100.png',
    absences: [
      { id: 301, startDate: new Date(), endDate: new Date(new Date().setDate(new Date().getDate() + 2)), type: 'Personal', status: 'Approved' },
    ],
  },
  {
    id: 4,
    name: 'Olivia Martinez',
    avatar: 'https://placehold.co/100x100.png',
    absences: [
      { id: 401, startDate: new Date('2024-08-26'), endDate: new Date('2024-08-30'), type: 'Vacation', status: 'Approved' },
      { id: 402, startDate: new Date('2024-09-16'), endDate: new Date('2024-09-20'), type: 'Vacation', status: 'Pending' },
    ],
  },
    {
    id: 5,
    name: 'David Lee',
    avatar: 'https://placehold.co/100x100.png',
    absences: [
      { id: 501, startDate: new Date(new Date().setDate(new Date().getDate() - 1)), endDate: new Date(), type: 'Sick Leave', status: 'Approved' },
    ],
  },
];

export const allAbsences = teamMembers.flatMap(member => 
  member.absences.map(absence => ({
    ...absence,
    memberName: member.name,
    avatar: member.avatar
  }))
).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
