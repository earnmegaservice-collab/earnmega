'use client';
import { SpatialPhotoStudio } from '../../components/profile/SpatialPhotoStudio';
export default function TestPage() {
    return <SpatialPhotoStudio onComplete={() => alert('complete')} />;
}
