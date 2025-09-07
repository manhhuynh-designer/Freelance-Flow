import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/nextauth';
import { MAX_SHARE_PAYLOAD_BYTES, ShareBlobSchema, ShareRecord, ShareSnapshotSchema } from '@/types/share';
import { buildSharePaths, loadUserIndex, putJsonBlob, saveGlobalIdMap, saveUserIndex, fetchJson } from '@/lib/blob-service';
import { shortId } from '@/lib/hash';
import { userBucketId } from '@/lib/hash';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions as any);
  if (!session || !(session as any).user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session as any).user.id as string;
  const userBucket = userBucketId(userId);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const payloadStr = JSON.stringify(body?.data ?? {});
  if (new TextEncoder().encode(payloadStr).length > MAX_SHARE_PAYLOAD_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  const parse = ShareSnapshotSchema.safeParse(body?.data);
  if (!parse.success) {
    return NextResponse.json({ error: 'Invalid snapshot', details: parse.error.flatten() }, { status: 400 });
  }

  const now = new Date().toISOString();
  // Per-task single share: reuse existing id for this task if present
  const prefix = `/shares/${userBucket}`;
  const existingIndex = await loadUserIndex(prefix);
  let existing = existingIndex.items.find(i => i.taskId === body?.taskId && i.status === 'active');
  const id = existing?.id || shortId();
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  let blobData = {
    meta: {
      id,
      type: parse.data.kind,
      createdAt: now,
      updatedAt: now,
      expiresAt: body?.expiresAt ?? null,
    },
    data: parse.data,
  };
  // If an existing share for this task exists, merge data instead of losing the other part.
  if (existing) {
    try {
      const prevBlob: any = await fetchJson(existing.blobKey);
      const prevParsed = ShareBlobSchema.safeParse(prevBlob);
      if (prevParsed.success) {
        const prev = prevParsed.data;
        const prevSnap: any = prev.data;
        const newSnap: any = parse.data;
        const createdAt = prev.meta?.createdAt || now;
        const mergedExpires = body?.expiresAt ?? prev.meta?.expiresAt ?? null;

        const mergeToCombined = (q: any | undefined, t: any | undefined) => ({
          kind: 'combined',
          schemaVersion: 1,
          quote: q,
          timeline: t,
        });

        let mergedData: any = newSnap;
        if (newSnap.kind === 'quote') {
          if (prevSnap.kind === 'timeline') {
            mergedData = mergeToCombined(newSnap, prevSnap);
          } else if (prevSnap.kind === 'combined') {
            mergedData = { ...prevSnap, quote: newSnap };
          }
        } else if (newSnap.kind === 'timeline') {
          if (prevSnap.kind === 'quote') {
            mergedData = mergeToCombined(prevSnap, newSnap);
          } else if (prevSnap.kind === 'combined') {
            mergedData = { ...prevSnap, timeline: newSnap };
          }
        } else if (newSnap.kind === 'combined') {
          // Use new combined as-is
          mergedData = newSnap;
        }

        const mergedType = mergedData.kind as any;
        blobData = {
          meta: {
            id,
            type: mergedType,
            createdAt,
            updatedAt: now,
            expiresAt: mergedExpires,
          },
          data: mergedData,
        };
      }
    } catch {}
  }
  const deriveTitle = (snap: any): string => {
    try {
      if (!snap) return '';
      if (snap.kind === 'quote') {
        return snap.task?.name || snap.task?.title || snap.quote?.task?.name || '';
      }
      if (snap.kind === 'timeline') {
        return snap.task?.name || snap.task?.title || '';
      }
      if (snap.kind === 'combined') {
        const fromTimeline = snap.timeline?.task?.name || snap.timeline?.task?.title;
        const fromQuote = snap.quote?.task?.name || snap.quote?.task?.title;
        return fromTimeline || fromQuote || '';
      }
      return '';
    } catch {
      return '';
    }
  };
  const shareTitle = deriveTitle(blobData.data);
  const { prefix: userPrefix, blobPath } = buildSharePaths(userBucket, id);

  // Load index and enforce quota BEFORE writing blob (10 active per user)
  const index = await loadUserIndex(userPrefix);
  const activeCount = index.items.filter((i) => i.status === 'active').length;
  if (!existing && activeCount >= 10) {
    return NextResponse.json({ error: 'Quota exceeded' }, { status: 429 });
  }

  const putRes = await putJsonBlob(blobPath, blobData, { token, allowOverwrite: true });

  if (existing) {
    // Overwrite existing record for this task
    existing.type = (blobData.meta.type as any) || parse.data.kind;
    existing.updatedAt = now;
    existing.blobKey = putRes.pathname;
    existing.status = 'active';
    if (shareTitle) existing.title = shareTitle;
    await saveUserIndex(userPrefix, index, { token });
  } else {
    const record: ShareRecord = {
      id,
      type: parse.data.kind,
      title: shareTitle || '',
      taskId: body?.taskId,
      createdAt: now,
      updatedAt: now,
      expiresAt: null,
      status: 'active',
  blobKey: putRes.pathname,
      viewCount: 0,
      lastAccessAt: null,
    };
    index.items.unshift(record);
    await saveUserIndex(userPrefix, index, { token });
  }

  await saveGlobalIdMap(id, { blobKey: putRes.pathname, userBucket, status: 'active', expiresAt: null }, { token });

  const outRecord = existing || index.items.find(i => i.id === id)!;
  return NextResponse.json({ ok: true, record: outRecord, url: `/s/${id}` });
}
