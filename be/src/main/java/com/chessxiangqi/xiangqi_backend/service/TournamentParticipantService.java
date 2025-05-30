package com.chessxiangqi.xiangqi_backend.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.chessxiangqi.xiangqi_backend.model.TournamentParticipant;
import com.chessxiangqi.xiangqi_backend.repository.TournamentParticipantRepository;

@Service
public class TournamentParticipantService {
    @Autowired
    private TournamentParticipantRepository tournamentParticipantRepository;

    public List<TournamentParticipant> getAllTournamentParticipants() {
        return tournamentParticipantRepository.findAll();
    }

    public Optional<TournamentParticipant> getTournamentParticipantById(String id) {
        return tournamentParticipantRepository.findById(id);
    }

    public TournamentParticipant createTournamentParticipant(TournamentParticipant participant) {
        return tournamentParticipantRepository.save(participant);
    }

    public TournamentParticipant updateTournamentParticipant(String id, TournamentParticipant participant) {
        participant.setId(id);
        return tournamentParticipantRepository.save(participant);
    }

    public void deleteTournamentParticipant(String id) {
        tournamentParticipantRepository.deleteById(id);
    }
} 