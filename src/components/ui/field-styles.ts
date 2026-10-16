// Shared form-control styles, so inputs, textareas and selects look the same everywhere.

const control =
  "w-full rounded-control border border-border-strong bg-surface-muted text-base text-foreground outline-none transition-[border-color,box-shadow,background-color] placeholder:text-subtle hover:border-subtle hover:bg-surface-container focus:border-foreground focus:bg-surface focus:ring-4 focus:ring-foreground/8 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger sm:text-[14px]";

export const textareaClasses = `${control} resize-y px-3.5 py-2.5`;

export const selectClasses = `${control} block h-11 sm:h-10 appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-9 pl-3.5 bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238a93a3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")]`;
