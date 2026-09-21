/* eslint-disable @next/next/no-img-element */
export default function Logo({ className = "h-8 w-auto" }) {
  return (
    <>
      <img src="/black-logo.svg" alt="Knock Nation" className={`${className} dark:hidden`} />
      <img src="/white-logo.svg" alt="Knock Nation" className={`${className} hidden dark:block`} />
    </>
  );
}
