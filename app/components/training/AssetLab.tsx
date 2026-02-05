'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileAudio, FileText, Loader2, CheckCircle2, XCircle, Trash2, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { KnowledgeVector } from '@/lib/supabase/types';

interface UploadStatus {
    filename: string;
    status: 'uploading' | 'processing' | 'success' | 'error';
    error?: string;
    result?: any;
}

export default function AssetLab() {
    const [uploads, setUploads] = useState<UploadStatus[]>([]);
    const [assets, setAssets] = useState<KnowledgeVector[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchAssets = useCallback(async () => {
        const { data } = await supabase
            .from('knowledge_vectors')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50); // Increased limit from 10 to 50

        if (data) setAssets(data);
    }, []);

    // Fetch existing assets on mount
    useEffect(() => {
        fetchAssets();
    }, [fetchAssets]);

    const deleteAsset = async (id: string) => {
        if (!confirm('Are you sure you want to delete this asset? This will remove it from AI learning forever.')) return;

        try {
            const res = await fetch(`/api/training/assets?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');

            // Remove from UI
            setAssets(prev => prev.filter(a => a.id !== id));
        } catch (error) {
            console.error(error);
            alert('Failed to delete asset');
        }
    };

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        for (const file of acceptedFiles) {
            const uploadStatus: UploadStatus = {
                filename: file.name,
                status: 'uploading'
            };

            setUploads(prev => [...prev, uploadStatus]);

            try {
                // Upload file
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/api/training/upload', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Upload failed');
                }

                const result = await response.json();

                // Update status
                setUploads(prev => prev.map(u =>
                    u.filename === file.name
                        ? { ...u, status: 'success', result }
                        : u
                ));

                // Refresh assets
                fetchAssets();

            } catch (error: any) {
                setUploads(prev => prev.map(u =>
                    u.filename === file.name
                        ? { ...u, status: 'error', error: error.message }
                        : u
                ));
            }
        }
    }, [fetchAssets]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'audio/*': ['.mp3', '.wav', '.m4a'],
            'text/plain': ['.txt'],
            'application/pdf': ['.pdf']
        }
    });

    const getCritiqueColor = (score: number) => {
        if (score >= 8) return 'text-green-400';
        if (score >= 6) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <div className="space-y-6">
            {/* Upload Zone */}
            <Card className="bg-surface border-surface-light">
                <CardHeader>
                    <CardTitle className="text-text-primary flex items-center gap-2">
                        <Upload className="w-5 h-5 text-electric-cyan" />
                        Asset Lab
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${isDragActive
                            ? 'border-electric-cyan bg-electric-cyan/10'
                            : 'border-surface-light hover:border-electric-cyan/50'
                            }`}
                    >
                        <input {...getInputProps()} />
                        <Upload className="w-12 h-12 mx-auto mb-4 text-text-secondary" />
                        <p className="text-text-primary font-medium mb-2">
                            {isDragActive ? 'Drop files here...' : 'Drag & drop files here'}
                        </p>
                        <p className="text-text-secondary text-sm">
                            Audio (mp3, wav) or Documents (pdf, txt)
                        </p>
                    </div>

                    {/* Upload Status */}
                    {uploads.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {uploads.map((upload, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-charcoal rounded-lg">
                                    <div className="flex items-center gap-3">
                                        {upload.status === 'uploading' && <Loader2 className="w-4 h-4 animate-spin text-electric-cyan" />}
                                        {upload.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                                        {upload.status === 'error' && <XCircle className="w-4 h-4 text-red-400" />}
                                        <span className="text-text-primary text-sm">{upload.filename}</span>
                                    </div>
                                    {upload.status === 'success' && upload.result?.critique && (
                                        <div className="flex gap-2">
                                            <Badge variant="outline" className={getCritiqueColor(upload.result.critique.objection_quality)}>
                                                Obj: {upload.result.critique.objection_quality}
                                            </Badge>
                                            <Badge variant="outline" className={getCritiqueColor(upload.result.critique.tone)}>
                                                Tone: {upload.result.critique.tone}
                                            </Badge>
                                            <Badge variant="outline" className={getCritiqueColor(upload.result.critique.closing_power)}>
                                                Close: {upload.result.critique.closing_power}
                                            </Badge>
                                        </div>
                                    )}
                                    {upload.status === 'error' && (
                                        <span className="text-red-400 text-sm">{upload.error}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Asset Library */}
            <Card className="bg-surface border-surface-light">
                <CardHeader>
                    <CardTitle className="text-text-primary">Knowledge Base</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {assets.length === 0 ? (
                            <p className="text-text-secondary text-center py-8">
                                No assets uploaded yet. Upload audio or documents to get started.
                            </p>
                        ) : (
                            assets.map((asset) => (
                                <div key={asset.id} className="p-4 bg-charcoal rounded-lg border border-surface-light">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3 flex-1">
                                            {asset.content_type === 'audio_transcript' ? (
                                                <FileAudio className="w-5 h-5 text-electric-cyan mt-1" />
                                            ) : (
                                                <FileText className="w-5 h-5 text-electric-cyan mt-1" />
                                            )}
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-text-primary font-medium">
                                                            {asset.metadata?.filename || 'Untitled'}
                                                        </span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {asset.content_type}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {asset.metadata?.url && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-text-tertiary hover:text-electric-cyan hover:bg-cyan-500/10 p-2 h-auto"
                                                                onClick={() => window.open(asset.metadata?.url, '_blank')}
                                                                title="Download Original"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-text-tertiary hover:text-red-400 hover:bg-red-500/10 p-2 h-auto"
                                                            onClick={() => deleteAsset(asset.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <p className="text-text-secondary text-sm line-clamp-2">
                                                    {asset.content.substring(0, 150)}...
                                                </p>
                                                {asset.critique && (
                                                    <div className="mt-2">
                                                        <p className="text-text-tertiary text-xs mb-1">AI Critique:</p>
                                                        <div className="flex gap-2">
                                                            <Badge variant="outline" className={getCritiqueColor(asset.critique.objection_quality)}>
                                                                Objection: {asset.critique.objection_quality}/10
                                                            </Badge>
                                                            <Badge variant="outline" className={getCritiqueColor(asset.critique.tone)}>
                                                                Tone: {asset.critique.tone}/10
                                                            </Badge>
                                                            <Badge variant="outline" className={getCritiqueColor(asset.critique.closing_power)}>
                                                                Closing: {asset.critique.closing_power}/10
                                                            </Badge>
                                                        </div>
                                                        <p className="text-text-secondary text-xs mt-2">{asset.critique.summary}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
