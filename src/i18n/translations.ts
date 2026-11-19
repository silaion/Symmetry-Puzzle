export type Language = 'ko' | 'en' | 'ja';

export interface TranslationDict {
  appTitle: string;
  appSubtitle: string;
  difficulty: {
    label: string;
    easy: string;
    normal: string;
    hard: string;
    easyDesc: string;
    normalDesc: string;
    hardDesc: string;
  };
  controls: {
    newPuzzle: string;
    resetPieces: string;
    rotateLeft: string;
    rotateRight: string;
    snapToggle: string;
    soundToggle: string;
    rules: string;
    selectedPiece: string;
    noSelection: string;
    angleStep: string;
    wheelHint: string;
    noFlipNotice: string;
  };
  validation: {
    solved: string;
    solvedSub: string;
    nextPuzzle: string;
    overlapError: string;
    notConnected: string;
    hasHoles: string;
    notSymmetric: string;
    connectedPieces: string;
    symmetryFound: string;
  };
  multiplayer: {
    title: string;
    soloMode: string;
    hostRoom: string;
    joinRoom: string;
    nickname: string;
    roomCode: string;
    roomCodePlaceholder: string;
    copyCode: string;
    copied: string;
    copyLink: string;
    linkCopied: string;
    createBtn: string;
    joinBtn: string;
    leaveBtn: string;
    connecting: string;
    connected: string;
    disconnected: string;
    playersCount: string;
    hostBadge: string;
    youBadge: string;
    roomFullError: string;
    connectionError: string;
    statusSolving: string;
    statusCombining: string;
    statusSolved: string;
    statusForfeited: string;
    startNewRound: string;
    waitingHost: string;
    winnerBanner: string;
  };
  solution: {
    showBtn: string;
    confirmTitle: string;
    confirmSoloDesc: string;
    confirmMultiDesc: string;
    confirmBtn: string;
    cancelBtn: string;
    revealedTitle: string;
    revealedSub: string;
    spectatingNotice: string;
  };
  rulesModal: {
    title: string;
    close: string;
    objectiveTitle: string;
    objectiveDesc: string;
    controlsTitle: string;
    controlsList: string[];
    winConditionsTitle: string;
    winConditionsList: string[];
    prohibitedTitle: string;
    prohibitedList: string[];
  };
}

export const TRANSLATIONS: Record<Language, TranslationDict> = {
  ko: {
    appTitle: '대칭 퍼즐',
    appSubtitle: 'Symmetry Puzzle · 3조각 선대칭 조합',
    difficulty: {
      label: '난이도',
      easy: '쉬움',
      normal: '보통',
      hard: '어려움',
      easyDesc: '6~8꼭짓점 · 30°/45°/60° 사선 분할 (구멍 없음)',
      normalDesc: '8~10꼭짓점 · 오목 다각형, 50% 확률 중앙 구멍',
      hardDesc: '10~14꼭짓점 · 깊은 오목/꺾임 분할, 80% 확률 구멍',
    },
    controls: {
      newPuzzle: '새 퍼즐',
      resetPieces: '위치 초기화',
      rotateLeft: '반시계 회전',
      rotateRight: '시계 회전',
      snapToggle: '자석 스냅',
      soundToggle: '효과음',
      rules: '게임 규칙',
      selectedPiece: '선택된 조각',
      noSelection: '조각을 클릭해 선택하세요',
      angleStep: '회전 단위',
      wheelHint: '드래그 이동 · 휠/핸들/키보드(Q/E, ←/→) 회전',
      noFlipNotice: '뒤집기(반전) 불가',
    },
    validation: {
      solved: '선대칭 완성!',
      solvedSub: '모든 조각이 빈틈없이 결합되어 완벽한 선대칭 도형을 이루었습니다.',
      nextPuzzle: '다음 문제 풀기',
      overlapError: '조각이 서로 겹쳐 있습니다',
      notConnected: '3조각을 변으로 맞대어 하나로 연결하세요',
      hasHoles: '내부에 빈틈(구멍)이 없어야 합니다',
      notSymmetric: '외곽선과 내부 구멍 전체가 선대칭을 이루지 않습니다',
      connectedPieces: '연결된 조각',
      symmetryFound: '선대칭 축 발견!',
    },
    multiplayer: {
      title: '멀티플레이 (최대 3인)',
      soloMode: '솔로 모드',
      hostRoom: '방 만들기',
      joinRoom: '방 참가하기',
      nickname: '닉네임',
      roomCode: '방 코드',
      roomCodePlaceholder: '예: SYM-1234',
      copyCode: '코드 복사',
      copied: '복사됨!',
      copyLink: '초대 링크 복사',
      linkCopied: '링크 복사됨!',
      createBtn: '방 생성',
      joinBtn: '참가',
      leaveBtn: '나가기',
      connecting: '연결 중...',
      connected: '연결됨',
      disconnected: '연결 끊김',
      playersCount: '참가자',
      hostBadge: '방장',
      youBadge: '나',
      roomFullError: '방이 가득 찼습니다 (최대 3인).',
      connectionError: '방에 연결할 수 없습니다. 코드를 확인해주세요.',
      statusSolving: '풀이 중',
      statusCombining: '조각 결합 중',
      statusSolved: '완성 완료!',
      statusForfeited: '포기함',
      startNewRound: '새 라운드 출제',
      waitingHost: '방장이 새 퍼즐을 출제할 때까지 대기 중...',
      winnerBanner: '님이 가장 먼저 퍼즐을 완성했습니다!',
    },
    solution: {
      showBtn: '해답 보기',
      confirmTitle: '해답을 확인하시겠습니까?',
      confirmSoloDesc: '현재 문제는 해답 확인 완료(포기) 상태로 기록되며, 조각들이 정답 위치로 자동 정렬됩니다.',
      confirmMultiDesc: '해답을 확인하면 이 라운드에서 즉시 기권(포기함) 처리되어 승리 대상에서 제외됩니다.',
      confirmBtn: '해답 보기',
      cancelBtn: '계속 풀기',
      revealedTitle: '해답 확인 완료 (포기)',
      revealedSub: '기준 정답 배치와 선대칭 축이 보드에 표시되었습니다.',
      spectatingNotice: '기권 처리됨 · 다른 플레이어가 끝날 때까지 관전 중',
    },
    rulesModal: {
      title: '게임 규칙 안내',
      close: '닫기',
      objectiveTitle: '게임 목표',
      objectiveDesc:
        '주어진 3개의 자유 다각형 조각을 이동 및 회전하여, 전체 외곽선이 하나의 선대칭(축대칭) 도형을 이루도록 가장 먼저 완성하세요.',
      controlsTitle: '조작 방법',
      controlsList: [
        '이동: 조각을 마우스나 터치로 드래그합니다. 다른 조각의 꼭짓점/변 근처에서는 자석처럼 스냅됩니다.',
        '회전: 조각을 선택한 상태에서 회전 핸들을 돌리거나, 하단 회전 버튼(1° / 5° / 15°), 마우스 휠, 키보드 Q/E 또는 ←/→ 를 사용하세요.',
      ],
      winConditionsTitle: '정답 판정 조건',
      winConditionsList: [
        '단일 연결성: 3조각이 모두 변을 맞대어 하나의 연결된 외곽선을 이루어야 합니다. (내부 구멍은 허용)',
        '겹침 금지: 조각끼리 면적이 겹치면 안 됩니다.',
        '선대칭 판정: 결합된 외곽선과 내부 구멍 집합 전체가 동일한 하나의 직선을 기준으로 선대칭이어야 합니다. (내부 분할선은 무관)',
      ],
      prohibitedTitle: '금지 사항',
      prohibitedList: [
        '조각 뒤집기(좌우/상하 반전)는 엄격히 금지됩니다.',
        '선대칭 없이 180° 점대칭만 만족하는 도형은 정답으로 인정되지 않습니다.',
      ],
    },
  },
  en: {
    appTitle: 'Symmetry Puzzle',
    appSubtitle: '3-Piece Line Symmetry Challenge',
    difficulty: {
      label: 'Difficulty',
      easy: 'Easy',
      normal: 'Normal',
      hard: 'Hard',
      easyDesc: '6–8 vertices · 30°/45°/60° diagonal cuts, no holes',
      normalDesc: '8–10 vertices · Concave cuts, 50% chance of 1 hole',
      hardDesc: '10–14 vertices · Deep concave & zigzag, 80% chance of 1–2 holes',
    },
    controls: {
      newPuzzle: 'New Puzzle',
      resetPieces: 'Reset',
      rotateLeft: 'Rotate CCW',
      rotateRight: 'Rotate CW',
      snapToggle: 'Snap',
      soundToggle: 'Sound',
      rules: 'Rules',
      selectedPiece: 'Selected',
      noSelection: 'Click a piece to select',
      angleStep: 'Step',
      wheelHint: 'Drag to move · Wheel / Handle / Q·E / ←·→ to rotate',
      noFlipNotice: 'Flipping Forbidden',
    },
    validation: {
      solved: 'Line Symmetry Achieved!',
      solvedSub: 'All 3 pieces are seamlessly joined into a valid symmetric polygon.',
      nextPuzzle: 'Next Puzzle',
      overlapError: 'Pieces are overlapping',
      notConnected: 'Join all 3 pieces edge-to-edge into one shape',
      hasHoles: 'No interior gaps or holes allowed',
      notSymmetric: 'Outer boundary & holes are not line-symmetric yet',
      connectedPieces: 'Connected',
      symmetryFound: 'Symmetry axis detected!',
    },
    multiplayer: {
      title: 'Multiplayer (Max 3)',
      soloMode: 'Solo Mode',
      hostRoom: 'Create Room',
      joinRoom: 'Join Room',
      nickname: 'Nickname',
      roomCode: 'Room Code',
      roomCodePlaceholder: 'e.g. SYM-1234',
      copyCode: 'Copy',
      copied: 'Copied!',
      copyLink: 'Copy Invite Link',
      linkCopied: 'Link Copied!',
      createBtn: 'Create',
      joinBtn: 'Join',
      leaveBtn: 'Leave',
      connecting: 'Connecting...',
      connected: 'Connected',
      disconnected: 'Disconnected',
      playersCount: 'Players',
      hostBadge: 'Host',
      youBadge: 'You',
      roomFullError: 'Room is full (max 3 players).',
      connectionError: 'Could not connect to room. Check the code.',
      statusSolving: 'Solving',
      statusCombining: 'Combining',
      statusSolved: 'Solved!',
      statusForfeited: 'Forfeited',
      startNewRound: 'New Round',
      waitingHost: 'Waiting for host to deal a new puzzle...',
      winnerBanner: ' solved the puzzle first!',
    },
    solution: {
      showBtn: 'Show Solution',
      confirmTitle: 'Reveal the solution?',
      confirmSoloDesc: 'This puzzle will be marked as forfeited, and the pieces will animate into the target arrangement.',
      confirmMultiDesc: 'Revealing the solution will immediately forfeit this round and exclude you from winning.',
      confirmBtn: 'Show Solution',
      cancelBtn: 'Keep Solving',
      revealedTitle: 'Solution Revealed (Forfeited)',
      revealedSub: 'The reference arrangement and line symmetry axis are shown on the board.',
      spectatingNotice: 'Forfeited · Spectating until the round ends',
    },
    rulesModal: {
      title: 'How to Play',
      close: 'Close',
      objectiveTitle: 'Objective',
      objectiveDesc:
        'Translate and rotate the 3 free polygon pieces so their combined outer silhouette forms a single line-symmetric (reflection-symmetric) polygon.',
      controlsTitle: 'Controls',
      controlsList: [
        'Move: Drag any piece with mouse or touch. Pieces magnetically snap to nearby vertices and edges.',
        'Rotate: Use the rotation handle on the selected piece, step buttons (1° / 5° / 15°), mouse wheel, or keys Q/E and ←/→.',
      ],
      winConditionsTitle: 'Win Conditions',
      winConditionsList: [
        'Single Contiguous Shape: All 3 pieces must share edges into one connected outer boundary (intended interior holes are allowed).',
        'Zero Overlap: Pieces cannot overlap each other.',
        'Line Symmetry Only: Both the outer boundary and all interior holes must reflect along the same axis (internal seam symmetry does not matter).',
      ],
      prohibitedTitle: 'Restrictions',
      prohibitedList: [
        'Flipping / mirroring pieces is strictly forbidden.',
        'Pure point symmetry (180° rotational symmetry without a reflection axis) is not accepted.',
      ],
    },
  },
  ja: {
    appTitle: '対称パズル',
    appSubtitle: 'Symmetry Puzzle · 3ピース線対称パズル',
    difficulty: {
      label: '難易度',
      easy: '初級',
      normal: '中級',
      hard: '上級',
      easyDesc: '6〜8頂点 · 30°/45°/60°斜線分割（穴なし）',
      normalDesc: '8〜10頂点 · 凹多角形・50%の確率で穴1個',
      hardDesc: '10〜14頂点 · 深い凹みと2段折れ分割・80%で穴あり',
    },
    controls: {
      newPuzzle: '新しい問題',
      resetPieces: '位置をリセット',
      rotateLeft: '反時計回り',
      rotateRight: '時計回り',
      snapToggle: '磁石スナップ',
      soundToggle: '効果音',
      rules: 'ルール',
      selectedPiece: '選択中のピース',
      noSelection: 'ピースをクリックして選択',
      angleStep: '回転角度',
      wheelHint: 'ドラッグ移動 · ホイール/ハンドル/Q・E/←・→で回転',
      noFlipNotice: '裏返し（反転）禁止',
    },
    validation: {
      solved: '線対称 完成！',
      solvedSub: '3つのピースが隙間なく結合し、美しい線対称図形が完成しました。',
      nextPuzzle: '次の問題へ',
      overlapError: 'ピース同士が重なっています',
      notConnected: '3つのピースを辺でつなげて1つの図形にしてください',
      hasHoles: '内部に隙間（穴）があってはいけません',
      notSymmetric: '外周と内部の穴全体がまだ線対称になっていません',
      connectedPieces: '結合済み',
      symmetryFound: '対称軸を検出！',
    },
    multiplayer: {
      title: 'マルチプレイ (最大3人)',
      soloMode: 'ソロモード',
      hostRoom: 'ルーム作成',
      joinRoom: 'ルーム参加',
      nickname: 'ニックネーム',
      roomCode: 'ルームコード',
      roomCodePlaceholder: '例: SYM-1234',
      copyCode: 'コピー',
      copied: 'コピー完了',
      copyLink: '招待リンクをコピー',
      linkCopied: 'リンクコピー完了',
      createBtn: '作成',
      joinBtn: '参加',
      leaveBtn: '退出',
      connecting: '接続中...',
      connected: '接続済み',
      disconnected: '切断',
      playersCount: '参加者',
      hostBadge: 'ホスト',
      youBadge: '自分',
      roomFullError: 'ルームが満員です（最大3人）。',
      connectionError: 'ルームに接続できません。コードを確認してください。',
      statusSolving: '解答中',
      statusCombining: '結合中',
      statusSolved: '完成！',
      statusForfeited: 'ギブアップ',
      startNewRound: '次のラウンド出題',
      waitingHost: 'ホストが新しい問題を出題するのを待っています...',
      winnerBanner: ' さんが一番最初に完成しました！',
    },
    solution: {
      showBtn: '解答を見る',
      confirmTitle: '解答を表示しますか？',
      confirmSoloDesc: 'この問題は解答確認済み（ギブアップ）として記録され、ピースが正解の位置へ自動整列します。',
      confirmMultiDesc: '解答を見るとこのラウンドは即座にギブアップ扱いとなり、勝利対象から除外されます。',
      confirmBtn: '解答を見る',
      cancelBtn: '解き続ける',
      revealedTitle: '解答確認済み (ギブアップ)',
      revealedSub: '基準となる正解配置と線対称軸がボードに表示されました。',
      spectatingNotice: 'ギブアップ済み · ラウンド終了まで観戦中',
    },
    rulesModal: {
      title: 'ゲームルール',
      close: '閉じる',
      objectiveTitle: '目的',
      objectiveDesc:
        '与えられた3つの自由多角形ピースを移動・回転させて、外周の輪郭が1つの線対称図形になるように誰よりも早く完成させましょう。',
      controlsTitle: '操作方法',
      controlsList: [
        '移動：ピースをドラッグします。他のピースの頂点や辺の近くで磁石のようにスナップします。',
        '回転：ピースを選択した状態で回転ハンドル、下の回転ボタン(1° / 5° / 15°)、マウスホイール、または Q/E・←/→ キーを使用します。',
      ],
      winConditionsTitle: '正解の条件',
      winConditionsList: [
        '単一連結：3つのピースがすべて辺で接し、1つの連結した外周を成すこと（内部の穴は許容）。',
        '重なり禁止：ピース同士が重なってはいけません。',
        '線対称判定：外周と内部の穴の集合全体が同じ1本の直線に対して線対称であること（内部の分割線は問いません）。',
      ],
      prohibitedTitle: '禁止事項',
      prohibitedList: [
        'ピースの裏返し（左右・上下反転）は厳禁です。',
        '線対称を持たない180°点対称のみの図形は正解になりません。',
      ],
    },
  },
};
