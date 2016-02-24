function solveQGLS4()
%SOLVEQGLS calculates formulas relevant to solution
%   Vorbedingung : ein crash ist gegeben

syms t_braking_s t_nothing_s v_own v_ahead s_range_m s_puffer_m a_haptic_ms a_eb_ms t_basic t_warning_s t_haptic_s a_ahead_ms;

eqn = v_own - a_haptic_ms * t_haptic_s - a_eb_ms * t_braking_s == ...
    v_ahead + a_ahead_ms*(t_nothing_s + t_warning_s + t_haptic_s + t_braking_s);
t_braking_solved = solve(eqn, t_braking_s)

eqn2 = s_range_m - s_puffer_m + v_ahead * (t_nothing_s + t_warning_s + t_haptic_s + t_braking_solved) + 0.5 * a_ahead_ms * (t_nothing_s + t_warning_s + t_haptic_s + t_braking_solved)^2 == ...
            v_own*(t_nothing_s + t_warning_s + t_haptic_s) - 0.5*(a_haptic_ms)*t_haptic_s^2 + (v_own - a_haptic_ms*t_haptic_s)*t_braking_solved - 0.5 * (a_eb_ms) * (t_braking_solved)^2;
t_nothing_solved = solve(eqn2, t_nothing_s)

%GL1 -- v_ahead == v_gebremst_ahead
%GL2 -- strecke_ahead - puffer = strecke gebremst
end