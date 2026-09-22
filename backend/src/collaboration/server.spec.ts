describe('Collaboration WS Server routing logic', () => {
  it('correctly extracts docName from connection URL', () => {
    const getDocName = (url?: string) => {
      return url ? url.slice(1).split('?')[0] || 'default' : 'default';
    };

    expect(getDocName('/report-42-summary')).toBe('report-42-summary');
    expect(getDocName('/report-100-conclusion?token=xyz')).toBe(
      'report-100-conclusion',
    );
    expect(getDocName('/')).toBe('default');
    expect(getDocName('')).toBe('default');
    expect(getDocName(undefined)).toBe('default');
  });

  it('manages client connections by document room', () => {
    const docs = new Map<string, Set<any>>();

    const addClient = (docName: string, ws: any) => {
      if (!docs.has(docName)) {
        docs.set(docName, new Set());
      }
      docs.get(docName)!.add(ws);
    };

    const removeClient = (docName: string, ws: any) => {
      const conns = docs.get(docName);
      if (conns) {
        conns.delete(ws);
        if (conns.size === 0) docs.delete(docName);
      }
    };

    const client1 = { id: 1, readyState: 1 };
    const client2 = { id: 2, readyState: 1 };

    addClient('doc-A', client1);
    addClient('doc-A', client2);
    expect(docs.get('doc-A')?.size).toBe(2);

    removeClient('doc-A', client1);
    expect(docs.get('doc-A')?.size).toBe(1);

    removeClient('doc-A', client2);
    expect(docs.has('doc-A')).toBe(false);
  });
});
