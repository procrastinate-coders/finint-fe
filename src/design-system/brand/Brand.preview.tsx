import { BrandLockup, BrandMark, Wordmark } from './Wordmark'

export const title = 'Brand — monochrome wordmark lockup'

export default function BrandPreview() {
  return (
    <div className="flex flex-wrap items-center gap-10">
      <BrandMark size={40} />
      <Wordmark className="text-[22px]" />
      <BrandLockup />
    </div>
  )
}
