package com.chessxiangqi.xiangqi_backend.service.ai;

import java.util.List;

/** Một engine cờ tướng nói chuyện bằng UCI. Một đối tượng chỉ chạy một tìm kiếm tại một thời điểm. */
public interface AiEngine extends AutoCloseable {

    /** Giới hạn tìm kiếm: đặt {@code depth} hoặc {@code movetimeMs} (cái nào khác null thì dùng). */
    record SearchLimit(Integer depth, Integer movetimeMs) {
    }

    /** Một nước gợi ý: {@code multiPv} bắt đầu từ 1 (tốt nhất), {@code move} dạng UCI, điểm tính bằng centipawn. */
    record Line(int multiPv, int scoreCp, String move) {
    }

    class EngineException extends Exception {
        public EngineException(String message) {
            super(message);
        }

        public EngineException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    /**
     * Tìm các nước tốt nhất từ thế {@code fen} sau khi đi {@code uciMoves}; trả về tối đa {@code multiPv} nước,
     * sắp xếp từ tốt nhất.
     */
    List<Line> search(String fen, List<String> uciMoves, SearchLimit limit, int multiPv) throws EngineException;

    /** Tiến trình còn chạy được không. */
    boolean isAlive();

    @Override
    void close();
}
